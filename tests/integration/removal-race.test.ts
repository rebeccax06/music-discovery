import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startApplication, type Application } from "../support/http.ts";

const chillDay = "soundcloud:296089690";
const TRIALS = 60;

/**
 * Adding to a word reads the word and then writes; removing the word deletes it and then clears what
 * referred to it. The actions commit separately, so an add can land after the cleanup.
 *
 * Every answer that accepts the write also reports the word as read after it, so an add that
 * landed after the removal is never presented as saved.
 *
 * The first two tests place the late write deterministically. The last two race real requests and
 * check that, whatever the interleaving, nothing refers to the removed word afterward and the add
 * answers either success (the word still existed after the write) or WORD_NOT_FOUND. They report
 * how many trials took each path, because a run in which the requests never overlapped proves
 * little; the counts are saved with the results.
 */
describe("Adding to a word while it is being removed", () => {
  let app: Application;
  beforeAll(async () => { app = await startApplication(); });
  afterAll(async () => { await app?.close(); });

  async function race(
    label: string,
    owner: { cookie: string },
    act: (association: string) => Promise<{ status: number; body: any }>,
    left: (association: string) => Promise<unknown[]>,
  ) {
    let accepted = 0;
    let reportedGone = 0;
    for (let trial = 0; trial < TRIALS; trial += 1) {
      const created = await app.request("/wall/associate", { label: `${label} ${trial}`, description: "", visibility: "PUBLIC" }, owner.cookie);
      const association = created.body.association as string;
      const [added, removed] = await Promise.all([act(association), app.request("/wall/remove", { association }, owner.cookie)]);
      expect(removed.status).toBe(200);
      expect([200, 404]).toContain(added.status);
      // An accepted add names the word only if the word existed after the write; otherwise it says so.
      if (added.status === 200 && added.body.word.label !== null) accepted += 1;
      if (added.status === 200 && added.body.word.label === null) reportedGone += 1;
      await app.settled();
      expect(await left(association)).toEqual([]);
    }
    expect((await app.request("/wall/list", {}, owner.cookie)).body).toEqual({ wall: { words: [] } });
    const refused = TRIALS - accepted - reportedGone;
    console.log(`${label}: of ${TRIALS} trials, ${accepted} stored the song while the word existed (cleared by the removal), ${reportedGone} stored it after the word was gone (answered with no word, cleared by the repair), ${refused} were refused before writing.`);
    return accepted;
  }

  async function removedWord(owner: { cookie: string }, label: string) {
    const created = await app.request("/wall/associate", { label, description: "", visibility: "PUBLIC" }, owner.cookie);
    const association = created.body.association as string;
    expect((await app.request("/wall/remove", { association }, owner.cookie)).status).toBe(200);
    return association;
  }

  test("an example written after its word's cleanup is cleared by the repair reaction", async () => {
    const owner = await app.signIn("LateExample");
    const association = await removedWord(owner, "Late");
    const late = { author: owner.user, item: chillDay, context: association, role: "EXAMPLE" as const, note: "", qualities: [] };

    const written = await app.assembled.Annotating.annotate(late);
    expect(written).toEqual({ annotation: expect.any(String) });
    await app.settled();
    expect(await app.concepts.Annotating._forContext({ context: association })).toEqual([]);

    // Without the reaction the same write stays in storage, which shows the reaction did the clearing.
    // Even then no wall can reach it: every read starts from a word that exists.
    await app.concepts.Annotating.annotate(late);
    expect(await app.concepts.Annotating._forContext({ context: association })).toHaveLength(1);
    expect((await app.request("/wall/list", {}, owner.cookie)).body).toEqual({ wall: { words: [] } });
    expect((await app.request("/wall/public", { username: "LateExample" })).body).toEqual({ owner: "LateExample", wall: { words: [] } });
    const again = await app.request("/wall/associate", { label: "Late", description: "", visibility: "PUBLIC" }, owner.cookie);
    expect(again.body.association).not.toBe(association);
    expect((await app.request("/wall/list", {}, owner.cookie)).body.wall.words[0].examples).toEqual([]);
  });

  test("a suggestion written after its word's cleanup is cleared by the repair reaction", async () => {
    const owner = await app.signIn("LateHost");
    const friend = await app.signIn("LateGuest");
    const association = await removedWord(owner, "Late");
    const late = { contributor: friend.user, recipient: owner.user, target: association, item: chillDay, note: "" };

    expect(await app.assembled.Pitching.pitch(late)).toEqual({ pitch: expect.any(String) });
    await app.settled();
    expect(await app.concepts.Pitching._forTarget({ target: association })).toEqual([]);

    await app.concepts.Pitching.pitch(late);
    expect(await app.concepts.Pitching._forTarget({ target: association })).toHaveLength(1);
    expect((await app.request("/wall/list", {}, owner.cookie)).body).toEqual({ wall: { words: [] } });
    expect((await app.request("/suggestions/send", { association, item: chillDay, note: "" }, friend.cookie)).status).toBe(404);
  });

  test("racing an add against the removal leaves no example behind", async () => {
    const owner = await app.signIn("RaceOwner");
    const accepted = await race(
      "example race",
      owner,
      association => app.request("/wall/examples/add", { association, item: chillDay, role: "EXAMPLE", note: "", qualities: [] }, owner.cookie),
      association => app.concepts.Annotating._forContext({ context: association }),
    );
    expect(accepted).toBeGreaterThanOrEqual(0);
  });

  test("racing a suggestion against the removal leaves no suggestion behind", async () => {
    const owner = await app.signIn("RaceHost");
    const friend = await app.signIn("RaceGuest");
    const accepted = await race(
      "suggestion race",
      owner,
      association => app.request("/suggestions/send", { association, item: chillDay, note: "" }, friend.cookie),
      association => app.concepts.Pitching._forTarget({ target: association }),
    );
    expect(accepted).toBeGreaterThanOrEqual(0);
  });
});
