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
      COMMONS_SIGN_IN_REFUSED: "FORBIDDEN",
      INVALID_ASSOCIATION: "INVALID_REQUEST",
      ASSOCIATION_EXISTS: "CONFLICT",
      UNKNOWN_ASSOCIATION: "NOT_FOUND",
      NOT_OWNER: "FORBIDDEN",
      WALL_NOT_FOUND: "NOT_FOUND",
      WORD_NOT_FOUND: "NOT_FOUND",
      ANNOTATION_EXISTS: "CONFLICT",
      UNKNOWN_ANNOTATION: "NOT_FOUND",
      NOT_AUTHOR: "FORBIDDEN",
      SELF_PITCH: "FORBIDDEN",
      ALREADY_PITCHED: "CONFLICT",
      UNKNOWN_PITCH: "NOT_FOUND",
      NOT_CONTRIBUTOR: "FORBIDDEN",
      NOT_RECIPIENT: "FORBIDDEN",
      ALREADY_REVIEWED: "CONFLICT",
      INVALID_REVIEW: "INVALID_REQUEST",
      NOT_A_MATCH: "NOT_FOUND",
      PERSON_NOT_FOUND: "NOT_FOUND",
      SELF_REQUEST: "INVALID_REQUEST",
      ALREADY_FRIENDS: "CONFLICT",
      REQUEST_WAITING: "CONFLICT",
      REQUEST_EXISTS: "CONFLICT",
      NO_REQUEST: "NOT_FOUND",
      NOT_FRIENDS: "NOT_FOUND",
    },
    limits: { requestBodyBytes: 16 * 1024 },
    cookies: {
      session: {
        name: "sound-it-out-session",
        input: "session",
        issue: ["/auth/login", "/auth/commons/finish", "/auth/commons/choose"]
          .map(path => ({ path, value: "session", expires: "expiresAt" })),
        clear: ["/auth/logout"],
      },
      commonsAttempt: {
        name: "sound-it-out-commons",
        input: "attempt",
        issue: [{ path: "/auth/commons/start", value: "attempt", expires: "expiresAt" }],
        clear: ["/auth/commons/finish", "/auth/commons/choose"],
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
