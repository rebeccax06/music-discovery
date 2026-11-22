import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { FOR_FRIENDS, VisibleWall } from "./SoundWall.ts";
import { session, username, validator } from "./validators.ts";

const { Friending, UserAuthenticating } = concepts;

const sessionOnly = validator(["session"], session, "Expected a session.");
const personInput = {
  input: { required: ["session", "username"] },
  validators: { input: validator(["session", "username"], (value) => session(value) && username(value.username), "Expected a username.") },
};

/**
 * A person's friends, each with the words that friend has opened to them, and the requests waiting
 * in each direction, by username. Each friend's words come from the same former every other reader
 * of a wall uses, at the friends' levels.
 */
const Circle = former(
  "the friends and requests of (user)",
  ({ user }, { friend, friendName, sender, senderName, recipient, recipientName }) =>
    form({
      friends: each(Friending._friends({ person: user }).is({ friend }))
        .where(UserAuthenticating._username({ user: friend }).is({ username: friendName }))
        .arranged(friendName)
        .form({ username: friendName, wall: VisibleWall({ user: friend, levels: FOR_FRIENDS }) }),
      received: each(Friending._received({ recipient: user }).is({ sender }))
        .where(UserAuthenticating._username({ user: sender }).is({ username: senderName }))
        .arranged(senderName)
        .form({ username: senderName }),
      sent: each(Friending._sent({ sender: user }).is({ recipient }))
        .where(UserAuthenticating._username({ user: recipient }).is({ username: recipientName }))
        .arranged(recipientName)
        .form({ username: recipientName }),
    }),
);

const List = endpoint("/friends/list", ({ session, user }) =>
  receive({ session })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(respond({ circle: Circle({ user }) })), { input: { required: ["session"] }, validators: { input: sessionOnly } });

/**
 * People are addressed by username, which this composition resolves; Friending sees only identities
 * and enforces every rule about who may ask, answer, or leave. The session's user is always the
 * actor, so nobody can answer a request on someone else's behalf.
 */
const Request = endpoint("/friends/request", ({ session, username, user, other }) =>
  receive({ session, username })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(
      where(UserAuthenticating._byUsername({ username }).is({ user: other }))
        .then(Friending.request({ sender: user, recipient: other }).responds({}))
        .then(respond({}))
        .named("known"),
      where(no(UserAuthenticating._byUsername({ username })))
        .then(respond({ error: "PERSON_NOT_FOUND" }))
        .named("unknown"),
    ), personInput);

const Accept = endpoint("/friends/accept", ({ session, username, user, other }) =>
  receive({ session, username })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(
      where(UserAuthenticating._byUsername({ username }).is({ user: other }))
        .then(Friending.accept({ recipient: user, sender: other }).responds({}))
        .then(respond({}))
        .named("known"),
      where(no(UserAuthenticating._byUsername({ username })))
        .then(respond({ error: "PERSON_NOT_FOUND" }))
        .named("unknown"),
    ), personInput);

const Decline = endpoint("/friends/decline", ({ session, username, user, other }) =>
  receive({ session, username })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(
      where(UserAuthenticating._byUsername({ username }).is({ user: other }))
        .then(Friending.decline({ recipient: user, sender: other }).responds({}))
        .then(respond({}))
        .named("known"),
      where(no(UserAuthenticating._byUsername({ username })))
        .then(respond({ error: "PERSON_NOT_FOUND" }))
        .named("unknown"),
    ), personInput);

const Cancel = endpoint("/friends/cancel", ({ session, username, user, other }) =>
  receive({ session, username })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(
      where(UserAuthenticating._byUsername({ username }).is({ user: other }))
        .then(Friending.cancel({ sender: user, recipient: other }).responds({}))
        .then(respond({}))
        .named("known"),
      where(no(UserAuthenticating._byUsername({ username })))
        .then(respond({ error: "PERSON_NOT_FOUND" }))
        .named("unknown"),
    ), personInput);

const Remove = endpoint("/friends/remove", ({ session, username, user, other }) =>
  receive({ session, username })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(
      where(UserAuthenticating._byUsername({ username }).is({ user: other }))
        .then(Friending.unfriend({ person: user, friend: other }).responds({}))
        .then(respond({}))
        .named("known"),
      where(no(UserAuthenticating._byUsername({ username })))
        .then(respond({ error: "PERSON_NOT_FOUND" }))
        .named("unknown"),
    ), personInput);

export const composition = {
  Circle: { List, Circle },
  Requests: { Request, Accept, Decline, Cancel },
  Leaving: { Remove },
};
