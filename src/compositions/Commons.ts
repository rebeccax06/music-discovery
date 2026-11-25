import { endpoint, receive, respond, type EndpointValidator } from "@mit-sdg/sync-engine/boundary";
import { concepts } from "../concepts.ts";

const { UserAuthenticating } = concepts;

function strings(...names: string[]): EndpointValidator {
  return value => {
    const input = value as Record<string, unknown>;
    return names.every(name => typeof input[name] === "string")
      ? { ok: true }
      : { ok: false, detail: "Expected Commons sign-in details." };
  };
}

const Start = endpoint("/auth/commons/start", ({ attempt, address, expiresAt }) =>
  receive({})
    .then(UserAuthenticating.startCommons({}).responds({ attempt, address, expiresAt }))
    .then(respond({ attempt, address, expiresAt })));

const Finish = endpoint("/auth/commons/finish", ({ attempt, state, code, user, username, session, expiresAt }) =>
  receive({ attempt, state, code })
    .then(UserAuthenticating.finishCommons({ attempt, state, code }).responds({ user, username, session, expiresAt }))
    .then(respond({ user, username, session, expiresAt })),
{ input: { required: ["attempt", "state", "code"] }, validators: { input: strings("state", "code") } });

const ChooseUsername = endpoint("/auth/commons/choose", ({ attempt, username, user, displayName, session, expiresAt }) =>
  receive({ attempt, username })
    .then(UserAuthenticating.chooseCommonsUsername({ attempt, username }).responds({ user, username: displayName, session, expiresAt }))
    .then(respond({ user, username: displayName, session, expiresAt })),
{ input: { required: ["attempt", "username"] }, validators: { input: strings("username") } });

export const composition = { Start, Finish, ChooseUsername };
