import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { clearOrphans } from "../../src/maintenance.ts";
import { startApplication, type Application } from "../support/http.ts";

const chillDay = "soundcloud:296089690";
const blueBoi = "soundcloud:437080521";

/**
 * The state a failed repair leaves behind: a song or suggestion whose word was removed. Writing it
 * straight to the concept, so no repair reaction runs, reproduces exactly that state.
 */
describe("Recovering from a failed repair", () => {
  let app: Application;
  beforeAll(async () => { app = await startApplication(); });
  afterAll(async () => { await app?.close(); });

  test("the startup sweep clears what refers to a removed word and nothing else, and reports it", async () => {
    const owner = await app.signIn("Sweeper");
    const friend = await app.signIn("SweeperFriend");
    const word = async (label: string) =>
      (await app.request("/wall/associate", { label, description: "", visibility: "PUBLIC" }, owner.cookie)).body.association as string;
    const kept = await word("Kept");
    const gone = await word("Gone");
    await app.request("/wall/examples/add", { association: kept, item: chillDay, role: "EXAMPLE", note: "Stays.", qualities: [] }, owner.cookie);
    await app.request("/suggestions/send", { association: kept, item: blueBoi, note: "Stays too." }, friend.cookie);
    expect((await app.request("/wall/remove", { association: gone }, owner.cookie)).status).toBe(200);

    await app.concepts.Annotating.annotate({ author: owner.user, item: chillDay, context: gone, role: "EXAMPLE", note: "", qualities: [] });
    await app.concepts.Pitching.pitch({ contributor: friend.user, recipient: owner.user, target: gone, item: blueBoi, note: "" });
    expect(await app.concepts.Annotating._contexts({})).toContainEqual({ context: gone });
    expect(await app.concepts.Pitching._targets({})).toContainEqual({ target: gone });
    const before = (await app.request("/wall/list", {}, owner.cookie)).body;

    expect(await clearOrphans(app.assembled)).toEqual({ songs: 1, suggestions: 1 });
    expect(await app.concepts.Annotating._forContext({ context: gone })).toEqual([]);
    expect(await app.concepts.Pitching._forTarget({ target: gone })).toEqual([]);
    expect((await app.request("/wall/list", {}, owner.cookie)).body).toEqual(before);

    // Running it again finds nothing: the sweep is safe to run at every start.
    expect(await clearOrphans(app.assembled)).toEqual({ songs: 0, suggestions: 0 });
  });
});
