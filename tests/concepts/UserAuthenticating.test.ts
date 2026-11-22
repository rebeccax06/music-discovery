import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  InvalidCredentials, InvalidPassword, InvalidUsername, UnknownSession,
  UserAuthenticatingConcept, UsernameTaken,
} from "../../src/concepts/UserAuthenticating.ts";
import { isolatedDatabase } from "../support/mongo.ts";

describe("UserAuthenticating", () => {
  let storage: Awaited<ReturnType<typeof isolatedDatabase>>;

  beforeAll(async () => { storage = await isolatedDatabase(); });
  afterAll(async () => { await storage?.close(); });

  test("recognizes the owner and ends only the requested session", async () => {
    const concept = new UserAuthenticatingConcept(storage.db);
    const password = "  music is subjective!  ";
    const { user } = await concept.register({ username: "  Alex  ", password });
    const first = await concept.authenticate({ username: "alex", password });
    const second = await concept.authenticate({ username: "ALEX", password });

    expect(first.session).not.toBe(second.session);
    expect(await concept.current(first)).toEqual({ user, username: "Alex" });
    await concept.logout(first);
    await expect(concept.current(first)).rejects.toBeInstanceOf(UnknownSession);
    await expect(concept.logout(first)).rejects.toBeInstanceOf(UnknownSession);
    expect(await concept.current(second)).toEqual({ user, username: "Alex" });
    expect(await concept._byUsername({ username: " ALEX " })).toEqual([{ user, name: "Alex" }]);
    expect(await concept._byUsername({ username: "nobody" })).toEqual([]);
    expect(await concept._username({ user })).toEqual([{ username: "Alex" }]);
    expect(await concept._username({ user: "nobody" })).toEqual([]);
    await expect(concept.authenticate({ username: "Alex", password: password.trim() }))
      .rejects.toBeInstanceOf(InvalidCredentials);
  });

  test("rejects invalid registration without using its name, and checks both password length limits", async () => {
    const concept = new UserAuthenticatingConcept(storage.db);
    await expect(concept.register({ username: "A B", password: "a valid password" }))
      .rejects.toBeInstanceOf(InvalidUsername);
    await expect(concept.register({ username: "Julia", password: "🎵".repeat(7) }))
      .rejects.toBeInstanceOf(InvalidPassword);
    await expect(concept.register({ username: "Julia", password: "x".repeat(129) }))
      .rejects.toBeInstanceOf(InvalidPassword);
    await expect(concept.authenticate({ username: "Julia", password: "🎵".repeat(8) }))
      .rejects.toBeInstanceOf(InvalidCredentials);
    const { user } = await concept.register({ username: "Julia", password: "🎵".repeat(8) });
    expect((await concept.authenticate({ username: "Julia", password: "🎵".repeat(8) })).user).toBe(user);
  });

  test("only one concurrent registration can claim a canonical name", async () => {
    const concept = new UserAuthenticatingConcept(storage.db);
    const attempts = [
      { username: "Daniel", password: "first password" },
      { username: " daniel ", password: "second password" },
    ];
    const results = await Promise.allSettled(attempts.map(input => concept.register(input)));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    for (const [index, result] of results.entries()) {
      const input = attempts[index]!;
      if (result.status === "fulfilled") expect((await concept.authenticate(input)).user).toBe(result.value.user);
      else {
        expect(result.reason).toBeInstanceOf(UsernameTaken);
        await expect(concept.authenticate(input)).rejects.toBeInstanceOf(InvalidCredentials);
      }
    }
  });

  test("refuses a session at its expiry even if storage cleanup has not run", async () => {
    let time = new Date();
    const concept = new UserAuthenticatingConcept(storage.db, () => time);
    const credentials = { username: "Mira", password: "a valid password" };
    await concept.register(credentials);
    const { user, session, expiresAt } = await concept.authenticate(credentials);
    expect(expiresAt.getTime() - time.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    time = new Date(expiresAt.getTime() - 1);
    expect((await concept.current({ session })).user).toBe(user);
    time = expiresAt;
    await expect(concept.current({ session })).rejects.toBeInstanceOf(UnknownSession);
  });
});
