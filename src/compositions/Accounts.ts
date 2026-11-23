import { endpoint, receive, respond, type EndpointValidator } from "@mit-sdg/sync-engine/boundary";
import { compute, no, where } from "@mit-sdg/sync-engine/language";
import { computations, concepts } from "../concepts.ts";

const { Registering, Authenticating, Sessioning } = concepts;

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

/**
 * The password is checked first because the engine does not undo `Registering.register` when a
 * later action in the same request is refused. The three writes then commit separately; the
 * answer comes only after the session has started, and the HTTP policy moves the session and its
 * expiry into the cookie.
 * The answer carries no display username; the browser asks Me for it.
 */
const Register = endpoint("/auth/register", ({ username, password, user, session, expiresAt, at }) =>
  receive({ username, password }).then(
    where(
      Authenticating._acceptable({ password }).is({ acceptable: true }),
      compute(computations.currentInstant, {}, at),
    )
      .then(Registering.register({ username }).responds({ user }))
      .then(Authenticating.set({ user, password }).responds({}))
      .then(Sessioning.start({ subject: user, at }).responds({ session, expiresAt }))
      .then(respond({ user, session, expiresAt }))
      .named("acceptable-password"),
    where(Authenticating._acceptable({ password }).is({ acceptable: false }))
      .then(respond({ error: "INVALID_PASSWORD" }))
      .named("unacceptable-password"),
  ), credentialInput);

/**
 * A username nobody has is refused exactly as a wrong password is, so a caller cannot tell which
 * usernames exist. Nothing is written before the session starts.
 */
const Login = endpoint("/auth/login", ({ username, password, user, session, expiresAt, at }) =>
  receive({ username, password }).then(
    where(
      Registering._byUsername({ username }).is({ user }),
      compute(computations.currentInstant, {}, at),
    )
      .then(Authenticating.authenticate({ user, password }).responds({}))
      .then(Sessioning.start({ subject: user, at }).responds({ session, expiresAt }))
      .then(respond({ user, session, expiresAt }))
      .named("known-username"),
    where(no(Registering._byUsername({ username })))
      .then(respond({ error: "INVALID_CREDENTIALS" }))
      .named("unknown-username"),
  ), credentialInput);

const sessionInput = { input: { required: ["session"] } };

const Me = endpoint("/auth/me", ({ session, user, username, at }) =>
  receive({ session })
    .where(compute(computations.currentInstant, {}, at))
    .then(Sessioning.use({ session, at }).responds({ subject: user }))
    .then(
      where(Registering._username({ user }).is({ username }))
        .then(respond({ user, username })),
    ), sessionInput);

/** Ends only the cookie's session; the HTTP policy clears the cookie. */
const Logout = endpoint("/auth/logout", ({ session, at }) =>
  receive({ session })
    .where(compute(computations.currentInstant, {}, at))
    .then(Sessioning.end({ session, at }).responds({}))
    .then(respond({})), sessionInput);

export const composition = { Register, Login, Me, Logout };
