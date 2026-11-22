import { endpoint, receive, respond, type EndpointValidator } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Annotating, Associating, UserAuthenticating } = concepts;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validator(accepts: (value: Record<string, unknown>) => boolean, detail: string): EndpointValidator {
  return (value) => (record(value) && accepts(value) ? { ok: true } : { ok: false, detail });
}

function ownKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function session(value: Record<string, unknown>) {
  return typeof value.session === "string" || value.session === null;
}

function boundedText(value: unknown, max: number) {
  return typeof value === "string" && value.length <= max;
}

function associationId(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 64;
}

const MAX_WORD = 40;

function visibility(value: unknown) {
  return value === "PRIVATE" || value === "PUBLIC";
}

const sessionOnly = validator(
  (value) => ownKeys(value, ["session"]) && session(value),
  "Expected a session.",
);

const associateInput = validator(
  (value) => ownKeys(value, ["session", "label", "description", "visibility"])
    && session(value)
    && boundedText(value.label, MAX_WORD)
    && boundedText(value.description, 500)
    && visibility(value.visibility),
  "Expected a word, description, and visibility.",
);

const updateInput = validator(
  (value) => ownKeys(value, ["session", "association", "label", "description"])
    && session(value)
    && associationId(value.association)
    && boundedText(value.label, MAX_WORD)
    && boundedText(value.description, 500),
  "Expected a word and a description.",
);

const visibilityInput = validator(
  (value) => ownKeys(value, ["session", "association", "visibility"])
    && session(value)
    && associationId(value.association)
    && visibility(value.visibility),
  "Expected a word and a visibility.",
);

const associationInput = validator(
  (value) => ownKeys(value, ["session", "association"]) && session(value) && associationId(value.association),
  "Expected a word.",
);

const publicInput = validator(
  (value) => ownKeys(value, ["username"]) && typeof value.username === "string"
    && value.username.length > 0 && value.username.length <= 64,
  "Expected a username.",
);

/** Every word the signed-in person defined, with the annotations on each word. */
const PersonalWall = former(
  "the personal sound wall (user)",
  ({ user }, { association, label, description, visibility, annotation, author, item, role, note, exampleVisibility }) =>
    form({
      words: each(Associating._byUser({ user }).is({ association, label, description, visibility }))
        .arranged(label)
        .form({
          association,
          label,
          description,
          visibility,
          examples: each(Annotating._forContext({ context: association }).is({
            annotation,
            author,
            item,
            role,
            note,
            visibility: exampleVisibility,
          })).arranged(annotation).form({ annotation, author, item, role, note, visibility: exampleVisibility }),
        }),
    }),
);

/** A person's public words and only the examples they have shared. */
const PublicWall = former(
  "a public sound wall (user)",
  ({ user }, { association, label, description, annotation, item, role, note }) =>
    form({
      words: each(Associating._byUser({ user }).is({ association, label, description, visibility: "PUBLIC" }))
        .arranged(label)
        .form({
          association,
          label,
          description,
          examples: each(Annotating._forContext({ context: association }).is({
            annotation,
            item,
            role,
            note,
            visibility: "SHARED",
          })).arranged(annotation).form({ annotation, item, role, note }),
        }),
    }),
);

const ListWall = endpoint("/wall/list", ({ session, user }) =>
  receive({ session })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(respond({ wall: PersonalWall({ user }) })), { input: { required: ["session"] }, validators: { input: sessionOnly } });

const Associate = endpoint("/wall/associate", ({ session, user, label, description, visibility, association }) =>
  receive({ session, label, description, visibility })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(Associating.associate({ user, label, description, visibility }).responds({ association }))
    .then(respond({ association })), { input: { required: ["session", "label", "description", "visibility"] }, validators: { input: associateInput } });

const UpdateWord = endpoint("/wall/update", ({ session, user, association, label, description }) =>
  receive({ session, association, label, description })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(Associating.update({ user, association, label, description }).responds({}))
    .then(respond({})), { input: { required: ["session", "association", "label", "description"] }, validators: { input: updateInput } });

const SetVisibility = endpoint("/wall/visibility", ({ session, user, association, visibility }) =>
  receive({ session, association, visibility })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(Associating.setVisibility({ user, association, visibility }).responds({}))
    .then(respond({})), { input: { required: ["session", "association", "visibility"] }, validators: { input: visibilityInput } });

const RemoveWord = endpoint("/wall/remove", ({ session, user, association }) =>
  receive({ session, association })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(Associating.remove({ user, association }).responds({}))
    .then(Annotating.clearContext({ context: association }).responds({}))
    .then(respond({})), { input: { required: ["session", "association"] }, validators: { input: associationInput } });

const ReadPublicWall = endpoint("/wall/public", ({ username, user, name }) =>
  receive({ username })
    .where(UserAuthenticating._byUsername({ username }).is({ user, name }))
    .then(respond({ owner: name, wall: PublicWall({ user }) })), { input: { required: ["username"] }, validators: { input: publicInput } });

const MissingWall = endpoint("/wall/public", ({ username }) =>
  receive({ username })
    .where(no(UserAuthenticating._byUsername({ username })))
    .then(respond({ error: "WALL_NOT_FOUND" })));

export const composition = {
  Definitions: { Associate, UpdateWord, SetVisibility, RemoveWord },
  Reading: { ListWall, PersonalWall, ReadPublicWall, MissingWall, PublicWall },
};
