import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { NotSignedIn, SessionEnded, SessioningConcept } from "../../src/concepts/Sessioning.ts";
import { isolatedDatabase } from "../support/mongo.ts";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

describe("Sessioning", () => {
  let storage: Awaited<ReturnType<typeof isolatedDatabase>>;
  let concept: SessioningConcept;

  beforeAll(async () => {
    storage = await isolatedDatabase();
    concept = new SessioningConcept(storage.db);
  });
  afterAll(async () => { await storage?.close(); });

  // Each test starts at the real time so the database's expiry sweep never removes a session mid-test.
  const later = (start: Date, milliseconds: number) => new Date(start.getTime() + milliseconds);

  test("its principle: Maya stays signed in until she signs out, leaves a session unused for a week, or reaches 90 days", async () => {
    const started = new Date();
    const { session: laptop, expiresAt } = await concept.start({ subject: "maya", at: started });
    expect(expiresAt).toEqual(later(started, 90 * DAY));
    expect(await concept.use({ session: laptop, at: started })).toEqual({ subject: "maya" });

    const { session: browser } = await concept.start({ subject: "maya", at: started });
    expect(await concept.end({ session: browser, at: started })).toEqual({ session: browser });
    const ended = concept.use({ session: browser, at: started });
    await expect(ended).rejects.toBeInstanceOf(NotSignedIn);
    await expect(ended).rejects.toThrow("Sign in to continue.");
    expect(await concept.use({ session: laptop, at: started })).toEqual({ subject: "maya" });

    const { session: library } = await concept.start({ subject: "maya", at: started });
    for (let day = 1; day < 90; day += 1) {
      const at = later(started, day * DAY);
      expect(await concept.use({ session: laptop, at })).toEqual({ subject: "maya" });
      if (day === 7) await expect(concept.use({ session: library, at })).rejects.toBeInstanceOf(NotSignedIn);
    }
    await expect(concept.use({ session: laptop, at: later(started, 90 * DAY) })).rejects.toBeInstanceOf(NotSignedIn);
  });

  test("start returns exactly a fresh random credential and its expiry", async () => {
    const at = new Date();
    const first = await concept.start({ subject: "maya", at });
    const second = await concept.start({ subject: "maya", at });
    expect(Object.keys(first).sort()).toEqual(["expiresAt", "session"]);
    expect(first.session).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.session).not.toBe(second.session);
  });

  test("only a digest of the credential is stored, and the session is found by it", async () => {
    const at = new Date();
    const { session } = await concept.start({ subject: "sam", at });
    const stored = await storage.db.collection("sessioning.sessions").find({ subject: "sam" }).toArray();
    expect(stored).toHaveLength(1);
    expect(JSON.stringify(stored)).not.toContain(session);
    expect(stored[0]!._id).not.toBe(session);
    expect(await concept.use({ session, at })).toEqual({ subject: "sam" });
  });

  test("a session ends exactly 7 days after its last use, and each use refreshes it", async () => {
    const started = new Date();
    const { session: idle } = await concept.start({ subject: "lee", at: started });
    expect(await concept.use({ session: idle, at: later(started, 7 * DAY - 1) })).toEqual({ subject: "lee" });
    await expect(concept.use({ session: idle, at: later(started, 14 * DAY - 1) })).rejects.toBeInstanceOf(NotSignedIn);

    const { session: unused } = await concept.start({ subject: "lee", at: started });
    await expect(concept.use({ session: unused, at: later(started, 7 * DAY) })).rejects.toBeInstanceOf(NotSignedIn);

    const { session: refreshed } = await concept.start({ subject: "lee", at: started });
    await concept.use({ session: refreshed, at: later(started, 6 * DAY) });
    expect(await concept.use({ session: refreshed, at: later(started, 12 * DAY) })).toEqual({ subject: "lee" });
    await expect(concept.use({ session: refreshed, at: later(started, 19 * DAY) })).rejects.toBeInstanceOf(NotSignedIn);
  });

  test("a use at an earlier instant succeeds without moving lastUsed backwards", async () => {
    const started = new Date();
    const sessions = storage.db.collection<{ _id: string; lastUsed: Date }>("sessioning.sessions");
    const { session } = await concept.start({ subject: "nia", at: started });
    const stored = async () => (await sessions.find({ subject: "nia" }).toArray())[0]!.lastUsed;

    expect(await concept.use({ session, at: later(started, 5 * DAY) })).toEqual({ subject: "nia" });
    expect(await concept.use({ session, at: later(started, 4 * DAY) })).toEqual({ subject: "nia" });
    expect(await stored()).toEqual(later(started, 5 * DAY));
    // The idle limit still counts from the later use: day 11 is less than a week after day 5.
    expect(await concept.use({ session, at: later(started, 11 * DAY) })).toEqual({ subject: "nia" });
  });

  test("a session ends at 90 days even when used every day", async () => {
    const started = new Date();
    const { session } = await concept.start({ subject: "kai", at: started });
    for (let day = 6; day < 90; day += 6) await concept.use({ session, at: later(started, day * DAY) });
    expect(await concept.use({ session, at: later(started, 90 * DAY - 1) })).toEqual({ subject: "kai" });
    await expect(concept.use({ session, at: later(started, 90 * DAY) })).rejects.toBeInstanceOf(NotSignedIn);
  });

  test("end removes only that session, and later use or end of it is refused", async () => {
    const at = new Date();
    const { session: first } = await concept.start({ subject: "alex", at });
    const { session: second } = await concept.start({ subject: "alex", at });
    expect(await concept.end({ session: first, at })).toEqual({ session: first });
    await expect(concept.use({ session: first, at })).rejects.toBeInstanceOf(NotSignedIn);
    const again = concept.end({ session: first, at });
    await expect(again).rejects.toBeInstanceOf(SessionEnded);
    await expect(again).rejects.toThrow("Sign in to continue.");
    expect(await concept.use({ session: second, at })).toEqual({ subject: "alex" });
  });

  test("use and end refuse an unknown, idle, or expired session and change nothing", async () => {
    const started = new Date();
    await expect(concept.use({ session: "missing", at: started })).rejects.toBeInstanceOf(NotSignedIn);
    await expect(concept.end({ session: "missing", at: started })).rejects.toBeInstanceOf(SessionEnded);

    const sessions = storage.db.collection("sessioning.sessions");
    const { session: idle } = await concept.start({ subject: "mira", at: started });
    const { session: old } = await concept.start({ subject: "mira", at: started });
    for (let day = 6; day < 90; day += 6) await concept.use({ session: old, at: later(started, day * DAY) });
    const before = await sessions.find({ subject: "mira" }).sort({ _id: 1 }).toArray();

    await expect(concept.use({ session: idle, at: later(started, 7 * DAY) })).rejects.toBeInstanceOf(NotSignedIn);
    await expect(concept.end({ session: idle, at: later(started, 7 * DAY) })).rejects.toBeInstanceOf(SessionEnded);
    await expect(concept.use({ session: old, at: later(started, 90 * DAY) })).rejects.toBeInstanceOf(NotSignedIn);
    await expect(concept.end({ session: old, at: later(started, 90 * DAY) })).rejects.toBeInstanceOf(SessionEnded);
    expect(await sessions.find({ subject: "mira" }).sort({ _id: 1 }).toArray()).toEqual(before);
  });

  test("use and end refuse a missing session without touching the database", async () => {
    const at = new Date();
    const sessions = storage.db.collection("sessioning.sessions");
    const before = await sessions.find().sort({ _id: 1 }).toArray();
    for (const session of [null, undefined, ""]) {
      const used = concept.use({ session: session as string | null, at });
      await expect(used).rejects.toBeInstanceOf(NotSignedIn);
      await expect(used).rejects.toThrow("Sign in to continue.");
      const ended = concept.end({ session: session as string | null, at });
      await expect(ended).rejects.toBeInstanceOf(SessionEnded);
      await expect(ended).rejects.toThrow("Sign in to continue.");
    }
    expect(await sessions.find().sort({ _id: 1 }).toArray()).toEqual(before);
  });

  test("of two ends of one session at once, one succeeds and the other is refused with SESSION_ENDED", async () => {
    const at = new Date();
    const { session } = await concept.start({ subject: "ben", at });
    const results = await Promise.allSettled([concept.end({ session, at }), concept.end({ session, at })]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find(result => result.status === "rejected")?.reason).toBeInstanceOf(SessionEnded);
  });
});
