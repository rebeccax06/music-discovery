import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startApplication, type Application } from "../support/http.ts";

const chillDay = "soundcloud:296089690";
const blueBoi = "soundcloud:437080521";
const flickermood = "soundcloud:293";

describe("Sound Wall over HTTP", () => {
  let app: Application;
  beforeAll(async () => { app = await startApplication(); });
  afterAll(async () => { await app?.close(); });

  const example = (association: string, item: string, extra: Record<string, unknown> = {}) =>
    ({ association, item, role: "EXAMPLE", note: "", qualities: [], ...extra });

  test("builds a word from songs without writing anything, shares part of it, and removes the songs with the word", async () => {
    const alex = await app.signIn("Alex");
    const created = await app.request("/wall/associate", { label: "  Dreamy  ", description: "", visibility: "PRIVATE" }, alex.cookie);
    expect(created.status).toBe(200);
    const association = created.body.association as string;

    const shared = await app.request("/wall/examples/add", example(association, chillDay, {
      qualities: ["soft drums", "airy vocals"],
    }), alex.cookie);
    expect(shared.status).toBe(200);
    const kept = await app.request("/wall/examples/add", example(association, blueBoi, {
      note: "  The chorus feels underwater.  ", qualities: ["airy vocals"],
    }), alex.cookie);
    expect(kept.status).toBe(200);

    app.restart();
    const listed = await app.request("/wall/list", {}, alex.cookie);
    expect(listed.status).toBe(200);
    expect(listed.body.wall.words).toHaveLength(1);
    expect(listed.body.wall.words[0]).toEqual({
      association,
      label: "Dreamy",
      description: "",
      visibility: "PRIVATE",
      examples: expect.arrayContaining([
        { annotation: shared.body.annotation, item: chillDay, role: "EXAMPLE", note: "", qualities: ["airy vocals", "soft drums"], visibility: "PRIVATE" },
        { annotation: kept.body.annotation, item: blueBoi, role: "EXAMPLE", note: "The chorus feels underwater.", qualities: ["airy vocals"], visibility: "PRIVATE" },
      ]),
      suggestions: [],
    });
    expect(listed.body.wall.words[0].examples).toHaveLength(2);
    expect((await app.request("/wall/public", { username: "alex" })).body).toEqual({ owner: "Alex", wall: { words: [] } });

    expect((await app.request("/wall/examples/visibility", { annotation: shared.body.annotation, visibility: "SHARED" }, alex.cookie)).status).toBe(200);
    expect((await app.request("/wall/public", { username: "alex" })).body.wall.words).toEqual([]);
    expect((await app.request("/wall/visibility", { association, visibility: "PUBLIC" }, alex.cookie)).status).toBe(200);

    const visitor = await app.request("/wall/public", { username: "ALEX" });
    expect(visitor.status).toBe(200);
    expect(visitor.body).toEqual({
      owner: "Alex",
      wall: {
        words: [{
          association,
          label: "Dreamy",
          description: "",
          visibility: "PUBLIC",
          examples: [{ annotation: shared.body.annotation, item: chillDay, role: "EXAMPLE", note: "", qualities: ["airy vocals", "soft drums"] }],
        }],
      },
    });

    const edited = await app.request("/wall/examples/update", {
      annotation: shared.body.annotation, role: "EXAMPLE", note: "Slow and soft.", qualities: ["slow tempo"],
    }, alex.cookie);
    expect(edited.status).toBe(200);
    expect((await app.request("/wall/public", { username: "Alex" })).body.wall.words[0].examples).toEqual([
      { annotation: shared.body.annotation, item: chillDay, role: "EXAMPLE", note: "Slow and soft.", qualities: ["slow tempo"] },
    ]);

    expect((await app.request("/wall/examples/remove", { annotation: kept.body.annotation }, alex.cookie)).status).toBe(200);
    expect((await app.request("/wall/examples/remove", { annotation: kept.body.annotation }, alex.cookie)).status).toBe(404);
    expect((await app.request("/wall/list", {}, alex.cookie)).body.wall.words[0].examples).toHaveLength(1);

    const other = await app.request("/wall/associate", { label: "Hype", description: "Driving percussion.", visibility: "PRIVATE" }, alex.cookie);
    const hype = other.body.association as string;
    const unrelated = await app.request("/wall/examples/add", example(hype, chillDay), alex.cookie);
    expect(unrelated.status).toBe(200);

    expect((await app.request("/wall/remove", { association }, alex.cookie)).status).toBe(200);
    expect(await app.concepts.Annotating._forContext({ context: association })).toEqual([]);
    expect((await app.request("/wall/public", { username: "Alex" })).body).toEqual({ owner: "Alex", wall: { words: [] } });
    expect((await app.request("/wall/list", {}, alex.cookie)).body).toEqual({
      wall: {
        words: [{
          association: hype,
          label: "Hype",
          description: "Driving percussion.",
          visibility: "PRIVATE",
          examples: [{ annotation: unrelated.body.annotation, item: chillDay, role: "EXAMPLE", note: "", qualities: [], visibility: "PRIVATE" }],
          suggestions: [],
        }],
      },
    });
  });

  test("changing a word's songs never changes the description its owner wrote", async () => {
    const mira = await app.signIn("Mira");
    const written = "Far-away vocals — like hearing a party from the next room.";
    const { association } = (await app.request("/wall/associate", { label: "Distant", description: written, visibility: "PUBLIC" }, mira.cookie)).body;
    const described = async () => (await app.request("/wall/list", {}, mira.cookie)).body.wall.words[0].description;

    const added = await app.request("/wall/examples/add", example(association, chillDay, { qualities: ["lots of reverb"] }), mira.cookie);
    expect(await described()).toBe(written);
    await app.request("/wall/examples/update", { annotation: added.body.annotation, role: "EXAMPLE", note: "", qualities: ["heavy drums", "fast tempo"] }, mira.cookie);
    await app.request("/wall/examples/visibility", { annotation: added.body.annotation, visibility: "SHARED" }, mira.cookie);
    expect(await described()).toBe(written);
    expect((await app.request("/wall/public", { username: "mira" })).body.wall.words[0].description).toBe(written);
    await app.request("/wall/examples/remove", { annotation: added.body.annotation }, mira.cookie);
    expect(await described()).toBe(written);

    expect((await app.request("/wall/update", { association, label: "Distant", description: "" }, mira.cookie)).status).toBe(200);
    expect(await described()).toBe("");
  });

  test("refuses a duplicate or empty word, and songs, qualities, and notes outside what is offered, storing nothing", async () => {
    const sam = await app.signIn("Sam");
    const associate = (body: Record<string, unknown>) => app.request("/wall/associate", body, sam.cookie);
    expect((await associate({ label: " ", description: "", visibility: "PRIVATE" })).status).toBe(400);
    expect((await associate({ label: "warm", description: "", visibility: "SECRET" })).status).toBe(400);
    expect((await associate({ label: "w".repeat(41), description: "", visibility: "PRIVATE" })).status).toBe(400);
    expect((await associate({ label: "warm", description: "x".repeat(501), visibility: "PRIVATE" })).status).toBe(400);
    const created = await associate({ label: "warm", description: "", visibility: "PRIVATE" });
    expect(created.status).toBe(200);
    expect((await associate({ label: " Warm ", description: "Another tone.", visibility: "PUBLIC" })).status).toBe(409);
    const association = created.body.association as string;

    const add = (extra: Record<string, unknown>) => app.request("/wall/examples/add", example(association, flickermood, extra), sam.cookie);
    expect((await add({ item: "soundcloud:1" })).status).toBe(400);
    expect((await add({ item: "https://evil.example/player" })).status).toBe(400);
    expect((await add({ qualities: ["perfect pitch"] })).status).toBe(400);
    expect((await add({ qualities: ["airy vocals", "soft drums", "warm bass", "slow tempo", "calm mood", "no vocals"] })).status).toBe(400);
    expect((await add({ qualities: ["airy vocals", "airy vocals"] })).status).toBe(400);
    expect((await add({ qualities: "airy vocals" })).status).toBe(400);
    expect((await add({ note: "n".repeat(281) })).status).toBe(400);
    expect((await add({ role: "FAVORITE" })).status).toBe(400);
    expect((await app.request("/wall/list", {}, sam.cookie)).body.wall.words).toEqual([
      { association, label: "warm", description: "", visibility: "PRIVATE", examples: [], suggestions: [] },
    ]);

    expect((await add({})).status).toBe(200);
    expect((await add({ note: "Again." })).status).toBe(409);
    expect((await app.request("/wall/list", {}, sam.cookie)).body.wall.words[0].examples).toHaveLength(1);
    expect((await app.request("/wall/public", { username: "nobody-here" })).status).toBe(404);
  });

  test("only a word's owner can change it or its songs, and a missing word looks the same as someone else's", async () => {
    const owner = await app.signIn("Owner");
    const other = await app.signIn("Other");
    const { association } = (await app.request("/wall/associate", { label: "Bright", description: "", visibility: "PUBLIC" }, owner.cookie)).body;
    const { annotation } = (await app.request("/wall/examples/add", example(association, chillDay, { note: "Mine." }), owner.cookie)).body;
    const before = (await app.request("/wall/list", {}, owner.cookie)).body;

    for (const cookie of [other.cookie, ""]) {
      const refused = cookie ? 403 : 401;
      expect((await app.request("/wall/update", { association, label: "Bright", description: "Not the owner's." }, cookie)).status).toBe(refused);
      expect((await app.request("/wall/visibility", { association, visibility: "PRIVATE" }, cookie)).status).toBe(refused);
      expect((await app.request("/wall/remove", { association }, cookie)).status).toBe(refused);
      expect((await app.request("/wall/examples/update", { annotation, role: "COUNTEREXAMPLE", note: "Changed.", qualities: [] }, cookie)).status).toBe(refused);
      expect((await app.request("/wall/examples/visibility", { annotation, visibility: "SHARED" }, cookie)).status).toBe(refused);
      expect((await app.request("/wall/examples/remove", { annotation }, cookie)).status).toBe(refused);
      expect((await app.request("/wall/list", {}, cookie)).status).toBe(cookie ? 200 : 401);
    }

    const intoAnothers = await app.request("/wall/examples/add", example(association, blueBoi), other.cookie);
    const intoMissing = await app.request("/wall/examples/add", example("no-such-word", blueBoi), other.cookie);
    expect(intoAnothers.status).toBe(404);
    expect(intoMissing).toEqual(intoAnothers);
    expect((await app.request("/wall/examples/add", example(association, blueBoi))).status).toBe(401);

    expect((await app.request("/wall/list", {}, owner.cookie)).body).toEqual(before);
    expect((await app.request("/wall/list", {}, other.cookie)).body).toEqual({ wall: { words: [] } });
  });
});
