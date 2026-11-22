import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startApplication, type Application } from "../support/http.ts";

const chillDay = "soundcloud:296089690";
const blueBoi = "soundcloud:437080521";

describe("Friends over HTTP", () => {
  let app: Application;
  beforeAll(async () => { app = await startApplication(); });
  afterAll(async () => { await app?.close(); });

  const circle = async (cookie: string) => (await app.request("/friends/list", {}, cookie)).body.circle;
  const labels = (response: { body: any }) => response.body.wall.words.map((word: any) => word.label);

  test("two people become friends by asking and accepting, and each can then see the other in their circle", async () => {
    const alex = await app.signIn("Alex");
    const daniel = await app.signIn("Daniel");
    expect(await circle(alex.cookie)).toEqual({ friends: [], received: [], sent: [] });

    expect((await app.request("/friends/request", { username: "alex" }, daniel.cookie)).status).toBe(200);
    expect(await circle(daniel.cookie)).toEqual({ friends: [], received: [], sent: [{ username: "Alex" }] });
    expect(await circle(alex.cookie)).toEqual({ friends: [], received: [{ username: "Daniel" }], sent: [] });

    app.restart();
    expect((await app.request("/friends/accept", { username: "DANIEL" }, alex.cookie)).status).toBe(200);
    expect(await circle(alex.cookie)).toEqual({ friends: [{ username: "Daniel", wall: { words: [] } }], received: [], sent: [] });
    expect(await circle(daniel.cookie)).toEqual({ friends: [{ username: "Alex", wall: { words: [] } }], received: [], sent: [] });

    expect((await app.request("/friends/remove", { username: "Alex" }, daniel.cookie)).status).toBe(200);
    expect(await circle(alex.cookie)).toEqual({ friends: [], received: [], sent: [] });
    expect((await app.request("/friends/remove", { username: "Alex" }, daniel.cookie)).status).toBe(404);
  });

  test("a word limited to friends opens for a friend, and for nobody else, and closes when the friendship ends", async () => {
    const owner = await app.signIn("Host");
    const friend = await app.signIn("Guest");
    const stranger = await app.signIn("Passerby");
    const word = async (label: string, visibility: string) =>
      (await app.request("/wall/associate", { label, description: "", visibility: "PRIVATE" }, owner.cookie)
        .then(async created => {
          await app.request("/wall/visibility", { association: created.body.association, visibility }, owner.cookie);
          return created.body.association as string;
        }));
    const forFriends = await word("Close", "LIMITED");
    await word("Open", "PUBLIC");
    await word("Mine", "PRIVATE");
    const shared = (await app.request("/wall/examples/add", { association: forFriends, item: chillDay, role: "EXAMPLE", note: "For friends.", qualities: ["warm bass"] }, owner.cookie)).body.annotation;
    await app.request("/wall/examples/visibility", { annotation: shared, visibility: "SHARED" }, owner.cookie);
    await app.request("/wall/examples/add", { association: forFriends, item: blueBoi, role: "EXAMPLE", note: "Kept back.", qualities: [] }, owner.cookie);

    const visit = (cookie: string) => app.request("/wall/visit", { username: "host" }, cookie);
    expect(labels(await visit(friend.cookie))).toEqual(["Open"]);

    await app.request("/friends/request", { username: "Host" }, friend.cookie);
    expect(labels(await visit(friend.cookie))).toEqual(["Open"]);
    expect((await app.request("/suggestions/send", { association: forFriends, item: blueBoi, note: "" }, friend.cookie)).status).toBe(404);

    await app.request("/friends/accept", { username: "Guest" }, owner.cookie);
    const asFriend = await visit(friend.cookie);
    expect(asFriend.body).toEqual({
      owner: "Host",
      wall: {
        words: [
          {
            association: forFriends, label: "Close", description: "", visibility: "LIMITED",
            examples: [{ annotation: shared, item: chillDay, role: "EXAMPLE", note: "For friends.", qualities: ["warm bass"] }],
          },
          { association: expect.any(String), label: "Open", description: "", visibility: "PUBLIC", examples: [] },
        ],
      },
    });
    expect((await circle(friend.cookie)).friends).toEqual([{ username: "Host", wall: asFriend.body.wall }]);
    expect(labels(await visit(stranger.cookie))).toEqual(["Open"]);
    expect(labels(await app.request("/wall/public", { username: "Host" }))).toEqual(["Open"]);
    expect((await app.request("/wall/visit", { username: "Host" })).status).toBe(401);
    expect((await app.request("/wall/visit", { username: "nobody-here" }, friend.cookie)).status).toBe(404);

    const preview = (await app.request("/wall/preview", {}, owner.cookie)).body;
    expect(preview.friends).toEqual(asFriend.body.wall);
    expect(preview.anyone).toEqual((await app.request("/wall/public", { username: "Host" })).body.wall);
    expect((await app.request("/wall/preview")).status).toBe(401);

    const sent = await app.request("/suggestions/send", { association: forFriends, item: blueBoi, note: "From a friend." }, friend.cookie);
    expect(sent.status).toBe(200);
    const refused = await app.request("/suggestions/send", { association: forFriends, item: chillDay, note: "" }, stranger.cookie);
    expect(refused.status).toBe(404);
    expect(refused).toEqual(await app.request("/suggestions/send", { association: "no-such-word", item: chillDay, note: "" }, stranger.cookie));

    expect((await app.request("/friends/remove", { username: "Guest" }, owner.cookie)).status).toBe(200);
    expect(labels(await visit(friend.cookie))).toEqual(["Open"]);
    expect((await app.request("/suggestions/send", { association: forFriends, item: chillDay, note: "" }, friend.cookie)).status).toBe(404);
    const kept = (await app.request("/wall/list", {}, owner.cookie)).body.wall.words.find((entry: any) => entry.association === forFriends);
    expect(kept.suggestions).toEqual([
      { pitch: sent.body.pitch, contributor: "Guest", item: blueBoi, note: "From a friend.", fit: "PENDING", response: "" },
    ]);
  });

  test("refuses requests that are signed out, to oneself, to nobody, repeated, or crossed, and only the right person can answer", async () => {
    const mira = await app.signIn("Mira");
    const sam = await app.signIn("Sam");
    const zed = await app.signIn("Zed");
    const ask = (username: string, cookie: string) => app.request("/friends/request", { username }, cookie);

    expect((await ask("Sam", "")).status).toBe(401);
    expect((await app.request("/friends/list")).status).toBe(401);
    expect((await ask("mira", mira.cookie)).status).toBe(400);
    expect((await ask("nobody-here", mira.cookie)).status).toBe(404);
    expect((await ask("", mira.cookie)).status).toBe(400);
    expect((await ask("Sam", mira.cookie)).status).toBe(200);
    expect((await ask("Sam", mira.cookie)).status).toBe(409);
    expect((await ask("Mira", sam.cookie)).status).toBe(409);

    for (const path of ["/friends/accept", "/friends/decline"]) {
      expect((await app.request(path, { username: "Mira" }, zed.cookie)).status).toBe(404);
      expect((await app.request(path, { username: "Sam" }, mira.cookie)).status).toBe(404);
      expect((await app.request(path, { username: "Mira" })).status).toBe(401);
    }
    expect((await app.request("/friends/cancel", { username: "Mira" }, sam.cookie)).status).toBe(404);
    expect((await app.request("/friends/cancel", { username: "Sam" }, zed.cookie)).status).toBe(404);
    expect(await circle(sam.cookie)).toEqual({ friends: [], received: [{ username: "Mira" }], sent: [] });
    expect(await circle(zed.cookie)).toEqual({ friends: [], received: [], sent: [] });

    expect((await app.request("/friends/decline", { username: "Mira" }, sam.cookie)).status).toBe(200);
    expect(await circle(mira.cookie)).toEqual({ friends: [], received: [], sent: [] });
    expect((await ask("Sam", mira.cookie)).status).toBe(200);
    expect((await app.request("/friends/cancel", { username: "Sam" }, mira.cookie)).status).toBe(200);
    expect((await app.request("/friends/accept", { username: "Mira" }, sam.cookie)).status).toBe(404);
    expect(await circle(sam.cookie)).toEqual({ friends: [], received: [], sent: [] });
    expect((await app.request("/friends/remove", { username: "Sam" }, mira.cookie)).status).toBe(404);
  });
});
