import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { InvalidUsername, RegisteringConcept, UsernameTaken } from "../../src/concepts/Registering.ts";
import { isolatedDatabase } from "../support/mongo.ts";

describe("Registering", () => {
  let storage: Awaited<ReturnType<typeof isolatedDatabase>>;
  let concept: RegisteringConcept;

  beforeAll(async () => {
    storage = await isolatedDatabase();
    concept = new RegisteringConcept(storage.db);
  });
  afterAll(async () => { await storage?.close(); });

  test("its principle: Maya is found by any capitalization and shown as she typed, and Ben cannot take MAYA", async () => {
    const result = await concept.register({ username: " Maya " });
    expect(Object.keys(result)).toEqual(["user"]);
    const maya = result.user;
    expect(await concept._byUsername({ username: "maya" })).toEqual([{ user: maya, username: "Maya" }]);
    expect(await concept._byUsername({ username: "  MAYA " })).toEqual([{ user: maya, username: "Maya" }]);
    expect(await concept._username({ user: maya })).toEqual([{ username: "Maya" }]);

    const taken = concept.register({ username: "MAYA" });
    await expect(taken).rejects.toBeInstanceOf(UsernameTaken);
    await expect(taken).rejects.toThrow("That username is already taken.");
    const { user: ben } = await concept.register({ username: "ben" });
    expect(ben).not.toBe(maya);
    expect(await concept._username({ user: maya })).toEqual([{ username: "Maya" }]);
  });

  test("a trimmed username must have 3 to 32 ASCII letters, digits, underscores, or hyphens", async () => {
    for (const username of ["ab", " ab ", "x".repeat(33), "maya lee", "maya!", "", "   ", "mayé"]) {
      const refusal = concept.register({ username });
      await expect(refusal).rejects.toBeInstanceOf(InvalidUsername);
      await expect(refusal).rejects.toThrow("Use 3 to 32 letters, numbers, underscores, or hyphens.");
    }
    expect(await concept._byUsername({ username: "ab" })).toEqual([]);
    for (const username of ["abc", "y".repeat(32), "Maya_Lee-2", `  ${"z".repeat(32)}  `]) {
      const { user } = await concept.register({ username });
      expect(await concept._username({ user })).toEqual([{ username: username.trim() }]);
    }
  });

  test("of two registrations differing only in case at once, one succeeds and the other is refused with USERNAME_TAKEN", async () => {
    const results = await Promise.allSettled([
      concept.register({ username: "Daniel" }),
      concept.register({ username: " daniel " }),
    ]);
    const winners = results.filter(result => result.status === "fulfilled");
    const losers = results.filter(result => result.status === "rejected");
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0]!.reason).toBeInstanceOf(UsernameTaken);
    expect(await concept._byUsername({ username: "DANIEL" })).toEqual([
      expect.objectContaining({ user: winners[0]!.value.user }),
    ]);
  });

  test("a username once taken stays taken on repeated attempts", async () => {
    await concept.register({ username: "Sam" });
    await expect(concept.register({ username: "sam" })).rejects.toBeInstanceOf(UsernameTaken);
    await expect(concept.register({ username: "Sam" })).rejects.toBeInstanceOf(UsernameTaken);
    expect(await concept._byUsername({ username: "sam" })).toHaveLength(1);
  });

  test("_byUsername and _username return no row for an unknown username or user", async () => {
    expect(await concept._byUsername({ username: "nobody" })).toEqual([]);
    expect(await concept._username({ user: "missing" })).toEqual([]);
  });
});
