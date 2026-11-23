import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startApplication, type Application } from "../support/http.ts";

const TRIALS = 400;
/** Ordinary answers take milliseconds; an unanswered request would wait for the engine's 30 s timeout. */
const ANSWERED_WITHIN_MS = 3000;

/**
 * Sibling guards on one endpoint do not share a snapshot, so a change between their reads could
 * make every guard drop and leave the request unanswered (design/verification/advisories.md). This
 * measures how often that happens when the state the guards read changes constantly, and checks
 * that every request that is answered is answered correctly.
 */
describe("Guards reading state that changes underneath them", () => {
  let app: Application;
  beforeAll(async () => { app = await startApplication(); });
  afterAll(async () => { await app?.close(); });

  async function within<T>(request: Promise<T>) {
    const late = Symbol("unanswered");
    const result = await Promise.race([request, Bun.sleep(ANSWERED_WITHIN_MS).then(() => late)]);
    return result === late ? null : (result as T);
  }

  test("sending suggestions while the word flips between public and private", async () => {
    const owner = await app.signIn("Flipper");
    const friend = await app.signIn("FlipperFriend");
    const { association } = (await app.request("/wall/associate", { label: "Flicker", description: "", visibility: "PUBLIC" }, owner.cookie)).body;
    const tracks = ["soundcloud:296089690", "soundcloud:322500042", "soundcloud:437080521", "soundcloud:333808909"];
    const outcomes = { sent: 0, refused: 0, duplicate: 0, unanswered: 0 };

    for (let trial = 0; trial < TRIALS; trial += 1) {
      const visibility = trial % 2 ? "PUBLIC" : "PRIVATE";
      const [sent] = await Promise.all([
        within(app.request("/suggestions/send", { association, item: tracks[trial % tracks.length], note: "" }, friend.cookie)),
        app.request("/wall/visibility", { association, visibility }, owner.cookie),
      ]);
      if (sent === null) outcomes.unanswered += 1;
      else if (sent.status === 200) outcomes.sent += 1;
      else if (sent.status === 404) outcomes.refused += 1;
      else if (sent.status === 409) outcomes.duplicate += 1;
      else throw new Error(`Unexpected answer ${sent.status}: ${JSON.stringify(sent.body)}`);
    }

    console.log(`guard race: ${TRIALS} suggestions sent while the word flipped: ${JSON.stringify(outcomes)}`);
    // Each track can be suggested once, so at most four sends succeed; the rest are refusals.
    expect(outcomes.sent).toBeLessThanOrEqual(tracks.length);
    expect(outcomes.unanswered).toBe(0);
    // Whatever interleaving occurred, a suggestion exists only for a track that was accepted.
    const stored = (await app.request("/wall/list", {}, owner.cookie)).body.wall.words[0].suggestions;
    expect(stored).toHaveLength(outcomes.sent);
  }, 120_000);

  test("visiting a wall while a friendship is made and ended", async () => {
    const owner = await app.signIn("Toggler");
    const visitor = await app.signIn("TogglerGuest");
    await app.request("/wall/associate", { label: "Close", description: "", visibility: "LIMITED" }, owner.cookie);
    let unanswered = 0;
    let wrong = 0;

    for (let trial = 0; trial < TRIALS / 4; trial += 1) {
      const change = async () => {
        await app.request("/friends/request", { username: "Toggler" }, visitor.cookie);
        await app.request("/friends/accept", { username: "TogglerGuest" }, owner.cookie);
        await app.request("/friends/remove", { username: "Toggler" }, visitor.cookie);
      };
      const [visit] = await Promise.all([within(app.request("/wall/visit", { username: "Toggler" }, visitor.cookie)), change()]);
      if (visit === null) unanswered += 1;
      else if (visit.status !== 200 || visit.body.wall.words.length > 1) wrong += 1;
    }

    console.log(`guard race: ${TRIALS / 4} visits while friendship changed: ${unanswered} unanswered, ${wrong} wrong`);
    expect(unanswered).toBe(0);
    expect(wrong).toBe(0);
  }, 120_000);
});
