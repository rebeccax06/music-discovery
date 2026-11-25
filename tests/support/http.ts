import { expect } from "bun:test";
import { assembleApplication, createInstances } from "../../src/assembly.ts";
import type { CommonsProvider } from "../../src/commonsProvider.ts";
import { createApi } from "../../src/http.ts";
import { isolatedDatabase } from "./mongo.ts";

export const origin = "https://sound-it-out.example";

/**
 * The assembled application over HTTP on its own database. Tests change state through `request`.
 * `concepts` reads stored state back in assertions. `assembled` asks a concept action through the
 * engine, so reactions run, for the one case a request cannot reach: an action landing late.
 */
export async function startApplication(commons?: CommonsProvider) {
  const storage = await isolatedDatabase();
  let instances = createInstances(storage.db, commons);
  let application = assembleApplication(instances);
  let handler = createApi(application, origin);

  return {
    get concepts() { return instances; },
    get assembled() { return application.concepts; },
    get routes() { return Object.keys(application.publicInterface.routes); },

    /** Resolves once every reaction started by earlier requests has finished. */
    settled: () => application.whenIdle(),

    /**
     * Assembles the application again over the same database, as a server restart would. `adjust`
     * can wrap concept methods first: the engine binds them when it assembles, so a wrapper added
     * afterward is never called.
     */
    restart(adjust?: (fresh: ReturnType<typeof createInstances>) => void) {
      instances = createInstances(storage.db, commons);
      adjust?.(instances);
      application = assembleApplication(instances);
      handler = createApi(application, origin);
    },

    async request(path: string, body: Record<string, unknown> = {}, cookie = "", requestOrigin = origin) {
      const response = await handler(new Request(`${origin}/api${path}`, {
        method: "POST",
        headers: { Origin: requestOrigin, Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }));
      return { status: response.status, body: await response.json() as any, cookies: response.headers.getSetCookie() };
    },

    /** Registers `username`, signs in, and returns the session cookie and the user identity. */
    async signIn(username: string) {
      const credentials = { username, password: "music is subjective" };
      const registered = await this.request("/auth/register", credentials);
      expect(registered.status).toBe(200);
      const response = await handler(new Request(`${origin}/api/auth/login`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      }));
      expect(response.status).toBe(200);
      return { cookie: response.headers.get("Set-Cookie")!.split(";")[0]!, user: registered.body.user as string };
    },

    close: () => storage.close(),
  };
}

export type Application = Awaited<ReturnType<typeof startApplication>>;

/**
 * Replaces one method of a concept instance for a test, keeping its name: the engine recognizes
 * actions and queries by method name. Use inside `restart(adjust)`, before assembly.
 */
export function around<T extends object, K extends keyof T & string>(
  target: T,
  name: K,
  wrap: (original: T[K]) => T[K],
) {
  const original = (target[name] as Function).bind(target) as T[K];
  const replacement = wrap(original) as Function;
  Object.defineProperty(replacement, "name", { value: name });
  target[name] = replacement as T[K];
}
