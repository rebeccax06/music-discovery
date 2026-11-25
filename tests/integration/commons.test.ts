import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createCommonsProvider } from "../../src/commonsProvider.ts";
import { UserAuthenticatingConcept } from "../../src/concepts/UserAuthenticating.ts";
import { startCommonsFixture } from "../support/commons.ts";
import { origin, startApplication, type Application } from "../support/http.ts";
import { isolatedDatabase } from "../support/mongo.ts";

const password = "music is subjective";
const attemptCookie = "__Host-sound-it-out-commons";
const sessionCookie = "__Host-sound-it-out-session";

function cookiePair(cookies: string[], name: string) {
  const value = cookies.find(cookie => cookie.startsWith(name + "="));
  expect(value).toBeDefined();
  return value!.split(";")[0]!;
}

describe("Commons sign-in over HTTP", () => {
  let provider: ReturnType<typeof startCommonsFixture>;
  let app: Application;

  beforeAll(async () => {
    provider = startCommonsFixture(origin);
    app = await startApplication(createCommonsProvider(provider.origin, origin));
  });
  afterAll(async () => {
    await app?.close();
    await provider?.stop();
  });

  async function start() {
    const response = await app.request("/auth/commons/start");
    expect(response.status).toBe(200);
    expect(Object.keys(response.body)).toEqual(["address"]);
    expect(response.cookies).toHaveLength(1);
    const attributes = response.cookies[0]!;
    expect(attributes).toContain("HttpOnly");
    expect(attributes).toContain("Secure");
    expect(attributes).toContain("Path=/;");
    const connect = new URL(response.body.address);
    expect(connect.origin).toBe(provider.origin);
    expect(connect.searchParams.get("app")).toBe(origin);
    expect(connect.searchParams.get("code_challenge_method")).toBe("S256");
    expect(connect.searchParams.get("code_verifier")).toBeNull();

    const approved = await fetch(connect, { redirect: "manual" });
    expect(approved.status).toBe(302);
    const { searchParams } = new URL(approved.headers.get("Location")!);
    const callback = { state: searchParams.get("state")!, code: searchParams.get("code")! };
    return { callback, cookie: cookiePair(response.cookies, attemptCookie) };
  }

  test("creates a passwordless account and returns to the same owner even after a provider username change", async () => {
    provider.setIdentity("stable-listener", "ClassListener");
    const first = await start();
    const finish = await app.request("/auth/commons/finish", first.callback, first.cookie);
    expect(finish.status).toBe(200);
    const { user } = finish.body;
    expect(finish.body).toEqual({ user: expect.any(String), username: "ClassListener" });
    const session = cookiePair(finish.cookies, sessionCookie);
    expect(finish.cookies.find(cookie => cookie.startsWith(attemptCookie + "="))).toContain("Max-Age=0");
    expect((await app.request("/auth/me", {}, session)).body).toEqual({ user, username: "ClassListener" });
    expect((await app.request("/auth/login", { username: "ClassListener", password })).status).toBe(401);
    expect((await app.request("/wall/associate", { label: "Chill", description: "", visibility: "PRIVATE" }, session)).status).toBe(200);
    expect((await app.request("/auth/logout", {}, session)).status).toBe(200);
    expect((await app.request("/auth/me", {}, session)).status).toBe(401);

    app.restart();
    provider.setIdentity("stable-listener", "RenamedAtCommons");
    const returning = await start();
    const again = await app.request("/auth/commons/finish", returning.callback, returning.cookie);
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ user, username: "ClassListener" });
    const wall = await app.request("/wall/list", {}, cookiePair(again.cookies, sessionCookie));
    expect(wall.status).toBe(200);
    expect(JSON.stringify(wall.body)).toContain("Chill");
  });

  test("requires the bound cookie and state, accepts the proof once, and rejects a foreign origin", async () => {
    provider.setIdentity("bound-listener", "BoundListener");
    const attempt = await start();
    const redemptions = provider.redemptions;
    expect((await app.request("/auth/commons/finish", attempt.callback)).status).toBe(403);
    expect((await app.request("/auth/commons/finish", { ...attempt.callback, state: "different" }, attempt.cookie)).status).toBe(403);
    expect((await app.request("/auth/commons/finish", attempt.callback, attempt.cookie, "https://other.example")).status).toBe(403);
    expect((await app.request("/auth/commons/choose", { username: "BoundListener" }, attempt.cookie)).status).toBe(403);
    expect(provider.redemptions).toBe(redemptions);

    const results = await Promise.all(Array.from({ length: 2 }, () =>
      app.request("/auth/commons/finish", attempt.callback, attempt.cookie),
    ));
    expect(results.map(response => response.status).sort()).toEqual([200, 403]);
    expect(provider.redemptions).toBe(redemptions + 1);
    const denied = results.find(response => response.status === 403)!;
    expect(denied.cookies).toEqual([]);
    expect((await app.request("/auth/commons/choose", { username: "BoundListener" }, attempt.cookie)).status).toBe(403);
  });

  test("offers another local username instead of linking to an existing password account", async () => {
    const local = await app.signIn("ExistingOwner");
    provider.setIdentity("another-listener", "existingowner");
    const attempt = await start();
    const collision = await app.request("/auth/commons/finish", attempt.callback, attempt.cookie);
    expect(collision.status).toBe(409);
    expect(collision.cookies).toEqual([]);
    expect((await app.request("/auth/commons/choose", { username: "bad name" }, attempt.cookie)).status).toBe(400);
    expect((await app.request("/auth/commons/choose", { username: "ExistingOwner" }, attempt.cookie)).status).toBe(409);

    const chosen = await app.request("/auth/commons/choose", { username: "AnotherListener" }, attempt.cookie);
    expect(chosen.status).toBe(200);
    expect(chosen.body.username).toBe("AnotherListener");
    expect(chosen.body.user).not.toBe(local.user);
    expect((await app.request("/auth/me", {}, local.cookie)).body).toEqual({ user: local.user, username: "ExistingOwner" });
    const loggedIn = await app.request("/auth/login", { username: "ExistingOwner", password });
    expect(loggedIn.body.user).toBe(local.user);
  });

  test("concurrent first sign-ins for one Commons identity converge on a single account", async () => {
    provider.setIdentity("two-attempt-listener", "TwoAttempts");
    const attempts = await Promise.all([start(), start()]);
    const results = await Promise.all(attempts.map(({ callback, cookie }) =>
      app.request("/auth/commons/finish", callback, cookie),
    ));
    expect(results.map(result => result.status)).toEqual([200, 200]);
    expect(results[0]!.body).toEqual(results[1]!.body);
    expect(results[0]!.body.username).toBe("TwoAttempts");
  });

  test("an expired attempt cannot redeem even before database cleanup runs", async () => {
    const storage = await isolatedDatabase();
    try {
      let now = new Date();
      const concept = new UserAuthenticatingConcept(storage.db, () => now, createCommonsProvider(provider.origin, origin));
      const pending = await concept.startCommons();
      now = new Date(pending.expiresAt);
      const redemptions = provider.redemptions;
      await expect(concept.finishCommons({
        attempt: pending.attempt,
        state: new URL(pending.address).searchParams.get("state")!,
        code: "unused",
      })).rejects.toThrow("Restart Commons sign-in.");
      expect(provider.redemptions).toBe(redemptions);
    } finally {
      await storage.close();
    }
  });
});
