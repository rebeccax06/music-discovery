import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { httpPolicy } from "@mit-sdg/sync-engine-http/policy";
import type { assembleApplication } from "./assembly.ts";

export function soundItOutPolicy(publicOrigin: string) {
  return httpPolicy({
    publicOrigin,
    basePath: "/api",
    requestOrigins: { allowed: [publicOrigin], requireOrigin: true },
    publicErrors: {
      INVALID_USERNAME: "INVALID_REQUEST",
      INVALID_PASSWORD: "INVALID_REQUEST",
      USERNAME_TAKEN: "CONFLICT",
      INVALID_CREDENTIALS: "UNAUTHORIZED",
      UNKNOWN_SESSION: "UNAUTHORIZED",
    },
    limits: { requestBodyBytes: 16 * 1024 },
    cookies: {
      session: {
        name: "sound-it-out-session",
        input: "session",
        issue: [{ path: "/auth/login", value: "session", expires: "expiresAt" }],
        clear: ["/auth/logout"],
      },
    },
  });
}

export function createApi(application: ReturnType<typeof assembleApplication>, publicOrigin: string) {
  return createHttpHandler({
    application,
    gateway: createGateway({ application }),
    policy: soundItOutPolicy(publicOrigin),
  });
}
