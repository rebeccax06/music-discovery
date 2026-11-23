import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  AuthenticatingConcept, InvalidCredentials, InvalidPassword, PasswordSet,
} from "../../src/concepts/Authenticating.ts";
import { isolatedDatabase } from "../support/mongo.ts";

describe("Authenticating", () => {
  let storage: Awaited<ReturnType<typeof isolatedDatabase>>;
  let concept: AuthenticatingConcept;

  beforeAll(async () => {
    storage = await isolatedDatabase();
    concept = new AuthenticatingConcept(storage.db);
  });
  afterAll(async () => { await storage?.close(); });

  test("its principle: Ben authenticates with his password, and Leo can neither guess it nor replace it", async () => {
    const password = "ben's secret song";
    expect(await concept.set({ user: "ben", password })).toEqual({ user: "ben" });
    expect(await concept.authenticate({ user: "ben", password })).toEqual({ user: "ben" });

    const guess = concept.authenticate({ user: "ben", password: "a wrong guess" });
    await expect(guess).rejects.toBeInstanceOf(InvalidCredentials);
    await expect(guess).rejects.toThrow("The username or password is incorrect.");

    const replace = concept.set({ user: "ben", password: "leo's new password" });
    await expect(replace).rejects.toBeInstanceOf(PasswordSet);
    await expect(replace).rejects.toThrow("This account already has a password.");
    await expect(concept.authenticate({ user: "ben", password: "leo's new password" }))
      .rejects.toBeInstanceOf(InvalidCredentials);
    expect(await concept.authenticate({ user: "ben", password })).toEqual({ user: "ben" });
  });

  test("an unknown user is refused like a wrong password", async () => {
    const refusal = concept.authenticate({ user: "nobody", password: "any password at all" });
    await expect(refusal).rejects.toBeInstanceOf(InvalidCredentials);
    await expect(refusal).rejects.toThrow("The username or password is incorrect.");
  });

  test("a password has 8 to 128 code points, counted exactly as supplied", async () => {
    const tooShort = concept.set({ user: "julia", password: "🎵".repeat(7) });
    await expect(tooShort).rejects.toBeInstanceOf(InvalidPassword);
    await expect(tooShort).rejects.toThrow("Use a password with 8 to 128 characters.");
    await expect(concept.set({ user: "julia", password: "x".repeat(129) })).rejects.toBeInstanceOf(InvalidPassword);
    await expect(concept.set({ user: "julia", password: "  abc  " })).rejects.toBeInstanceOf(InvalidPassword);
    // A refused set leaves the user without a password, so a later acceptable set succeeds.
    expect(await concept.set({ user: "julia", password: "🎵".repeat(8) })).toEqual({ user: "julia" });
    expect(await concept.authenticate({ user: "julia", password: "🎵".repeat(8) })).toEqual({ user: "julia" });
    expect(await concept.set({ user: "kai", password: "x".repeat(128) })).toEqual({ user: "kai" });

    expect(await concept._acceptable({ password: "🎵".repeat(7) })).toEqual({ acceptable: false });
    expect(await concept._acceptable({ password: "🎵".repeat(8) })).toEqual({ acceptable: true });
    expect(await concept._acceptable({ password: "x".repeat(128) })).toEqual({ acceptable: true });
    expect(await concept._acceptable({ password: "x".repeat(129) })).toEqual({ acceptable: false });
    expect(await concept._acceptable({ password: "   abcd   " })).toEqual({ acceptable: true });
    expect(await concept._acceptable({ password: "  abc  " })).toEqual({ acceptable: false });
  });

  test("a password is never trimmed", async () => {
    const password = "  music is subjective!  ";
    await concept.set({ user: "alex", password });
    expect(await concept.authenticate({ user: "alex", password })).toEqual({ user: "alex" });
    await expect(concept.authenticate({ user: "alex", password: password.trim() }))
      .rejects.toBeInstanceOf(InvalidCredentials);
  });

  test("only an Argon2id verifier is stored, never the password", async () => {
    const password = "stored data must not reveal this";
    await concept.set({ user: "mira", password });
    const stored = await storage.db.collection("authenticating.users").findOne({ _id: "mira" as never });
    expect(stored).not.toBeNull();
    expect(stored!.verifier).not.toBe(password);
    expect(stored!.verifier).toStartWith("$argon2id$");
    expect(JSON.stringify(stored)).not.toContain(password);
  });

  test("of two sets for one user at once, one succeeds and the other is refused with PASSWORD_SET", async () => {
    const results = await Promise.allSettled([
      concept.set({ user: "daniel", password: "first password" }),
      concept.set({ user: "daniel", password: "second password" }),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const lost = results.find(result => result.status === "rejected");
    expect(lost?.reason).toBeInstanceOf(PasswordSet);
  });
});
