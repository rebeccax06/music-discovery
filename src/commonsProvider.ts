import { createHash } from "node:crypto";

export interface CommonsProvider {
  issuer: string;
  address(request: { state: string; verifier: string }): string;
  redeem(request: { code: string; verifier: string }): Promise<{ subject: string; username: string } | undefined>;
}

/** Implements the Commons authorization-code contract for course apps. */
export function createCommonsProvider(commonsOrigin: string, publicOrigin: string): CommonsProvider {
  const host = new URL(commonsOrigin);
  const local = host.protocol === "http:" && ["localhost", "127.0.0.1"].includes(host.hostname);
  if (!local && host.protocol !== "https:") throw new Error("COMMONS_ORIGIN must use HTTPS or a loopback development address.");
  const issuer = host.origin;
  const app = new URL(publicOrigin).origin;
  return {
    issuer,
    address({ state, verifier }) {
      const url = new URL("/connect", issuer);
      url.search = new URLSearchParams({
        app,
        state,
        code_challenge: createHash("sha256").update(verifier).digest("base64url"),
        code_challenge_method: "S256",
      }).toString();
      return url.href;
    },
    async redeem({ code, verifier }) {
      try {
        const response = await fetch(new URL("/api/connect/redeem", issuer), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app, code, code_verifier: verifier }),
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (!data || typeof data !== "object") return;
        const { user, username } = data as Record<string, unknown>;
        if (typeof user === "string" && user.length > 0 && user.length <= 256 && typeof username === "string") {
          return { subject: user, username };
        }
      } catch {
        return;
      }
    },
  };
}
