import { createHash } from "node:crypto";
import { COMMONS_CALLBACK_PATH } from "../../shared/commons.ts";

/** A loopback stand-in for the provider. The app still builds and redeems the actual wire requests. */
export function startCommonsFixture(app: string) {
  const codes = new Map<string, { challenge: string; user: string; username: string }>();
  let identity = { user: "commons-person", username: "commons-listener" };
  let redemptions = 0;
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    routes: {
      "/connect": request => {
        const params = new URL(request.url).searchParams;
        const state = params.get("state");
        const challenge = params.get("code_challenge");
        if (params.get("app") !== app || params.get("code_challenge_method") !== "S256"
          || !state || !challenge || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
          return new Response("Invalid connect request", { status: 400 });
        }
        const code = crypto.randomUUID();
        codes.set(code, { challenge, ...identity });
        const callback = new URL(COMMONS_CALLBACK_PATH, app);
        callback.search = new URLSearchParams({ code, state }).toString();
        return Response.redirect(callback);
      },
      "/api/connect/redeem": async request => {
        redemptions += 1;
        const body = await request.json() as { app: string; code: string; code_verifier: string };
        const issued = codes.get(body.code);
        codes.delete(body.code);
        const challenge = typeof body.code_verifier === "string"
          && createHash("sha256").update(body.code_verifier).digest("base64url");
        if (request.method !== "POST" || body.app !== app || !issued || issued.challenge !== challenge) {
          return Response.json({ error: "CONNECT_CODE_INVALID" }, { status: 400 });
        }
        return Response.json({ user: issued.user, username: issued.username });
      },
    },
    fetch: () => new Response("Not found", { status: 404 }),
  });
  return {
    origin: server.url.origin,
    get redemptions() { return redemptions; },
    setIdentity(user: string, username: string) { identity = { user, username }; },
    stop: () => server.stop(),
  };
}
