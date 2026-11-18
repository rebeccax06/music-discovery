import { endpoint, receive, respond, type EndpointValidator } from "@mit-sdg/sync-engine/boundary";
import { concepts } from "../concepts.ts";

const { UserAuthenticating } = concepts;

const credentials: EndpointValidator = (value) => {
  const input = value as Record<string, unknown>;
  return typeof input.username === "string" && typeof input.password === "string"
    ? { ok: true }
    : { ok: false, detail: "Expected a username and password." };
};

const credentialInput = {
  input: { required: ["username", "password"] },
  validators: { input: credentials },
};

const Register = endpoint("/auth/register", ({ username, password, user }) =>
  receive({ username, password })
    .then(UserAuthenticating.register({ username, password }).responds({ user }))
    .then(respond({ user })), credentialInput);

const Login = endpoint("/auth/login", ({ username, password, user, displayName, session, expiresAt }) =>
  receive({ username, password })
    .then(UserAuthenticating.authenticate({ username, password }).responds({ user, username: displayName, session, expiresAt }))
    .then(respond({ user, username: displayName, session, expiresAt })), credentialInput);

const sessionInput = { input: { required: ["session"] } };

const Me = endpoint("/auth/me", ({ session, user, username }) =>
  receive({ session })
    .then(UserAuthenticating.current({ session }).responds({ user, username }))
    .then(respond({ user, username })), sessionInput);

const Logout = endpoint("/auth/logout", ({ session }) =>
  receive({ session })
    .then(UserAuthenticating.logout({ session }).responds({}))
    .then(respond({})), sessionInput);

export const composition = { Register, Login, Me, Logout };
