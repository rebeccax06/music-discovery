import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startApplication, type Application } from "../support/http.ts";

const chillDay = "soundcloud:296089690";
const blueBoi = "soundcloud:437080521";
const arcade = "soundcloud:681078026";

describe("Suggestions over HTTP", () => {
  let app: Application;
  beforeAll(async () => { app = await startApplication(); });
  afterAll(async () => { await app?.close(); });

  async function publicWord(cookie: string, label: string) {
    const created = await app.request("/wall/associate", { label, description: "", visibility: "PUBLIC" }, cookie);
    expect(created.status).toBe(200);
    return created.body.association as string;
  }

  const wordOf = async (cookie: string, association: string) =>
    (await app.request("/wall/list", {}, cookie)).body.wall.words.find((word: any) => word.association === association);

  test("a friend suggests a song, the owner reviews it privately, and only the owner's separate step makes it an example", async () => {
    const alex = await app.signIn("Alex");
    const daniel = await app.signIn("Daniel");
    const association = await publicWord(alex.cookie, "Hype");

    const sent = await app.request("/suggestions/send", { association, item: arcade, note: "  The drop made me think of you.  " }, daniel.cookie);
    expect(sent.status).toBe(200);
    const pitch = sent.body.pitch as string;

    expect(await wordOf(alex.cookie, association)).toMatchObject({
      examples: [],
      suggestions: [{ pitch, contributor: "Daniel", item: arcade, note: "The drop made me think of you.", fit: "PENDING", response: "" }],
    });
    expect((await app.request("/suggestions/sent", {}, daniel.cookie)).body).toEqual({
      suggestions: [{ pitch, to: "Alex", word: association, item: arcade, note: "The drop made me think of you.", reviewed: false }],
    });
    expect((await app.request("/wall/public", { username: "Alex" })).body.wall.words[0].examples).toEqual([]);

    expect((await app.request("/suggestions/promote", { pitch, note: "", qualities: [] }, alex.cookie)).status).toBe(404);
    expect((await app.request("/suggestions/review", { pitch, fit: "PARTIAL", response: "Drums fit, vocals too much." }, alex.cookie)).status).toBe(200);
    expect((await app.request("/suggestions/promote", { pitch, note: "", qualities: [] }, alex.cookie)).status).toBe(404);
    expect((await wordOf(alex.cookie, association)).examples).toEqual([]);

    app.restart();
    expect((await app.request("/suggestions/review", { pitch, fit: "MATCH", response: " Exactly this. " }, alex.cookie)).status).toBe(200);
    expect((await wordOf(alex.cookie, association)).suggestions[0]).toMatchObject({ fit: "MATCH", response: "Exactly this." });
    expect((await wordOf(alex.cookie, association)).examples).toEqual([]);
    expect((await app.request("/suggestions/sent", {}, daniel.cookie)).body).toEqual({
      suggestions: [{ pitch, to: "Alex", word: association, item: arcade, note: "The drop made me think of you.", reviewed: true }],
    });
    expect((await app.request("/suggestions/sent", {}, alex.cookie)).body).toEqual({ suggestions: [] });
    expect((await app.request("/suggestions/withdraw", { pitch }, daniel.cookie)).status).toBe(409);

    const promoted = await app.request("/suggestions/promote", { pitch, note: "The drop.", qualities: ["heavy drums"] }, alex.cookie);
    expect(promoted.status).toBe(200);
    expect((await wordOf(alex.cookie, association)).examples).toEqual([
      { annotation: promoted.body.annotation, item: arcade, role: "EXAMPLE", note: "The drop.", qualities: ["heavy drums"], visibility: "PRIVATE" },
    ]);
    expect((await app.request("/wall/public", { username: "Alex" })).body.wall.words[0].examples).toEqual([]);

    expect((await app.request("/suggestions/review", { pitch, fit: "MISS", response: "Changed my mind." }, alex.cookie)).status).toBe(200);
    expect((await wordOf(alex.cookie, association)).examples).toHaveLength(1);
  });

  test("promoting a match twice, or twice at once, adds one example", async () => {
    const owner = await app.signIn("Twice");
    const friend = await app.signIn("TwiceFriend");
    const association = await publicWord(owner.cookie, "Calm");

    for (const [item, together] of [[chillDay, false], [blueBoi, true]] as const) {
      const { pitch } = (await app.request("/suggestions/send", { association, item, note: "" }, friend.cookie)).body;
      await app.request("/suggestions/review", { pitch, fit: "MATCH", response: "" }, owner.cookie);
      const promote = () => app.request("/suggestions/promote", { pitch, note: "", qualities: [] }, owner.cookie);
      const results = together ? await Promise.all([promote(), promote()]) : [await promote(), await promote()];
      expect(results.map(result => result.status).sort()).toEqual([200, 409]);
      const examples = (await wordOf(owner.cookie, association)).examples.filter((entry: any) => entry.item === item);
      expect(examples).toHaveLength(1);
    }
  });

  test("a suggestion never reveals a private example, and the owner learns of the overlap only when adding it", async () => {
    const owner = await app.signIn("Keeper");
    const friend = await app.signIn("KeeperFriend");
    const association = await publicWord(owner.cookie, "Warm");
    const hidden = await app.request("/wall/examples/add", {
      association, item: chillDay, role: "EXAMPLE", note: "Private reason.", qualities: [],
    }, owner.cookie);
    expect(hidden.status).toBe(200);

    const overlapping = await app.request("/suggestions/send", { association, item: chillDay, note: "" }, friend.cookie);
    const fresh = await app.request("/suggestions/send", { association, item: blueBoi, note: "" }, friend.cookie);
    expect(overlapping.status).toBe(200);
    expect(Object.keys(overlapping.body)).toEqual(Object.keys(fresh.body));

    await app.request("/suggestions/review", { pitch: overlapping.body.pitch, fit: "MATCH", response: "" }, owner.cookie);
    const promoted = await app.request("/suggestions/promote", { pitch: overlapping.body.pitch, note: "Replaced?", qualities: [] }, owner.cookie);
    expect(promoted.status).toBe(409);
    expect((await wordOf(owner.cookie, association)).examples).toEqual([
      { annotation: hidden.body.annotation, item: chillDay, role: "EXAMPLE", note: "Private reason.", qualities: [], visibility: "PRIVATE" },
    ]);
  });

  test("refuses suggestions that are signed out, to oneself, repeated, or for a word that is not public, without saying which words exist", async () => {
    const owner = await app.signIn("Host");
    const friend = await app.signIn("Guest");
    const second = await app.signIn("SecondGuest");
    const association = await publicWord(owner.cookie, "Bright");
    const hidden = (await app.request("/wall/associate", { label: "Secret", description: "", visibility: "PRIVATE" }, owner.cookie)).body.association;
    const send = (body: Record<string, unknown>, cookie: string) => app.request("/suggestions/send", { note: "", ...body }, cookie);

    expect((await send({ association, item: chillDay }, "")).status).toBe(401);
    expect((await send({ association, item: chillDay }, owner.cookie)).status).toBe(403);
    expect((await send({ association, item: "soundcloud:1" }, friend.cookie)).status).toBe(400);
    expect((await send({ association, item: chillDay, note: "n".repeat(281) }, friend.cookie)).status).toBe(400);

    const toPrivate = await send({ association: hidden, item: chillDay }, friend.cookie);
    const toMissing = await send({ association: "no-such-word", item: chillDay }, friend.cookie);
    expect(toPrivate.status).toBe(404);
    expect(toMissing).toEqual(toPrivate);
    expect(await app.concepts.Pitching._forTarget({ target: hidden })).toEqual([]);

    expect((await send({ association, item: chillDay }, friend.cookie)).status).toBe(200);
    expect((await send({ association, item: chillDay }, friend.cookie)).status).toBe(409);
    expect((await send({ association, item: chillDay }, second.cookie)).status).toBe(409);
    expect((await wordOf(owner.cookie, association)).suggestions).toHaveLength(1);
    expect((await app.request("/suggestions/sent", {}, second.cookie)).body).toEqual({ suggestions: [] });
    expect((await app.request("/suggestions/sent")).status).toBe(401);
  });

  test("only the contributor can withdraw and only the owner can review or add, and a refused attempt changes nothing", async () => {
    const owner = await app.signIn("Reviewer");
    const friend = await app.signIn("Proposer");
    const stranger = await app.signIn("Bystander");
    const association = await publicWord(owner.cookie, "Soft");
    const { pitch } = (await app.request("/suggestions/send", { association, item: chillDay, note: "For you." }, friend.cookie)).body;
    const review = (cookie: string, fit = "MATCH") => app.request("/suggestions/review", { pitch, fit, response: "Mine now." }, cookie);
    const promote = (cookie: string) => app.request("/suggestions/promote", { pitch, note: "", qualities: [] }, cookie);

    expect((await review(friend.cookie)).status).toBe(403);
    expect((await review(stranger.cookie)).status).toBe(403);
    expect((await review("")).status).toBe(401);
    expect((await review(owner.cookie, "PENDING")).status).toBe(400);
    expect((await app.request("/suggestions/withdraw", { pitch }, stranger.cookie)).status).toBe(403);
    expect((await app.request("/suggestions/withdraw", { pitch }, owner.cookie)).status).toBe(403);
    expect((await app.request("/suggestions/withdraw", { pitch })).status).toBe(401);
    expect((await wordOf(owner.cookie, association)).suggestions).toEqual([
      { pitch, contributor: "Proposer", item: chillDay, note: "For you.", fit: "PENDING", response: "" },
    ]);

    expect((await review(owner.cookie)).status).toBe(200);
    expect((await promote(friend.cookie)).status).toBe(404);
    expect((await promote(stranger.cookie)).status).toBe(404);
    expect((await promote("")).status).toBe(401);
    expect((await wordOf(owner.cookie, association)).examples).toEqual([]);

    const withdrawn = (await app.request("/suggestions/send", { association, item: blueBoi, note: "" }, friend.cookie)).body.pitch;
    expect((await app.request("/suggestions/withdraw", { pitch: withdrawn }, friend.cookie)).status).toBe(200);
    expect((await app.request("/suggestions/withdraw", { pitch: withdrawn }, friend.cookie)).status).toBe(404);
    expect((await wordOf(owner.cookie, association)).suggestions).toHaveLength(1);
  });

  test("removing a word removes the suggestions made for it", async () => {
    const owner = await app.signIn("Leaver");
    const friend = await app.signIn("LeaverFriend");
    const association = await publicWord(owner.cookie, "Gone");
    const { pitch } = (await app.request("/suggestions/send", { association, item: chillDay, note: "" }, friend.cookie)).body;
    expect((await app.request("/wall/remove", { association }, owner.cookie)).status).toBe(200);

    expect(await app.concepts.Pitching._get({ pitch })).toEqual([]);
    expect((await app.request("/suggestions/sent", {}, friend.cookie)).body).toEqual({ suggestions: [] });
    expect((await app.request("/suggestions/review", { pitch, fit: "MATCH", response: "" }, owner.cookie)).status).toBe(404);
  });
});
