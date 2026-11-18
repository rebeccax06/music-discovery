import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { assembleApplication, createInstances } from "../../src/assembly.ts";
import { createApi } from "../../src/http.ts";
import { isolatedDatabase } from "../support/mongo.ts";

const origin = "https://sound-it-out.example";

describe("Accounts over HTTP", () => {
  let storage: Awaited<ReturnType<typeof isolatedDatabase>>;
  let handler: ReturnType<typeof createApi>;

  function restart() {
    handler = createApi(assembleApplication(createInstances(storage.db)), origin);
  }

  beforeAll(async () => { storage = await isolatedDatabase(); restart(); });
  afterAll(async () => { await storage?.close(); });

  async function request(path: string, body = {}, cookie = "", requestOrigin = origin) {
    const response = await handler(new Request(`${origin}/api/auth/${path}`, {
      method: "POST",
      headers: { Origin: requestOrigin, Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json(), cookie: response.headers.get("Set-Cookie") };
  }

  test("creates an account, restores the same actor after reassembly, and revokes the cookie on sign-out", async () => {
    const credentials = { username: "Listener", password: "music is subjective" };
    const registration = await request("register", credentials);
    expect(registration.status).toBe(200);
    expect(registration.body).toEqual({ user: expect.any(String) });
    expect(registration.cookie).toBeNull();

    const login = await request("login", { ...credentials, username: "listener" });
    expect(login.status).toBe(200);
    const user = (registration.body as { user: string }).user;
    expect(login.body).toEqual({ user, username: "Listener" });
    expect(login.cookie).toContain("HttpOnly");
    expect(login.cookie).toContain("Secure");
    expect(login.cookie).toContain("SameSite=Strict");
    const cookie = login.cookie!.split(";")[0]!;
    expect(cookie).toStartWith("__Host-sound-it-out-session=");

    restart();
    const current = await request("me", {}, cookie);
    expect(current.status).toBe(200);
    expect(current.body).toEqual({ user, username: "Listener" });
    const ended = await request("logout", {}, cookie);
    expect(ended.status).toBe(200);
    expect(ended.cookie).toContain("Max-Age=0");
    expect((await request("me", {}, cookie)).status).toBe(401);
  });

  test("refuses malformed credentials and session claims outside the cookie boundary", async () => {
    const credentials = { username: "AnotherListener", password: "music is subjective" };
    expect((await request("register", { ...credentials, username: {} })).status).toBe(400);
    expect((await request("register", credentials)).status).toBe(200);
    expect((await request("login", credentials, "", "https://unrelated.example")).status).toBe(403);
    expect((await request("login", { ...credentials, password: "the wrong password" })).status).toBe(401);
    const { cookie: header } = await request("login", credentials);
    const cookie = header!.split(";")[0]!;
    const token = cookie.split("=")[1]!;

    expect((await request("me", { session: token })).status).toBe(401);
    expect((await request("logout", {}, cookie, "https://unrelated.example")).status).toBe(403);
    const stillSignedIn = await request("me", {}, cookie);
    expect(stillSignedIn.status).toBe(200);
    expect(stillSignedIn.body).toEqual({ user: expect.any(String), username: credentials.username });
  });
});
