import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { compute, each, form, former, is, no, reaction, when, where, whether } from "@mit-sdg/sync-engine/language";
import { MAX_DESCRIPTION, MAX_WORD } from "../../shared/limits.ts";
import { computations, concepts } from "../concepts.ts";
import { boundedText, catalogTrack, identity, note, pickedQualities, session, username, validator } from "./validators.ts";

const { Annotating, Associating, Friending, Pitching, Registering, Sessioning } = concepts;

function wordVisibility(value: unknown) {
  return value === "PRIVATE" || value === "LIMITED" || value === "PUBLIC";
}

/** The words a friend of the owner may open, and the words anyone may open. */
export const FOR_FRIENDS = ["LIMITED", "PUBLIC"];
export const FOR_ANYONE = ["PUBLIC"];

function exampleRole(value: unknown) {
  return value === "EXAMPLE" || value === "COUNTEREXAMPLE";
}

const sessionOnly = validator(["session"], session, "Expected a session.");

const associateInput = validator(
  ["session", "label", "description", "visibility"],
  (value) => session(value)
    && boundedText(value.label, MAX_WORD)
    && boundedText(value.description, MAX_DESCRIPTION)
    && wordVisibility(value.visibility),
  "Expected a word, description, and visibility.",
);

const updateInput = validator(
  ["session", "association", "label", "description"],
  (value) => session(value)
    && identity(value.association)
    && boundedText(value.label, MAX_WORD)
    && boundedText(value.description, MAX_DESCRIPTION),
  "Expected a word and a description.",
);

const visibilityInput = validator(
  ["session", "association", "visibility"],
  (value) => session(value) && identity(value.association) && wordVisibility(value.visibility),
  "Expected a word and a visibility.",
);

const associationInput = validator(
  ["session", "association"],
  (value) => session(value) && identity(value.association),
  "Expected a word.",
);

const publicInput = validator(["username"], (value) => username(value.username), "Expected a username.");

const visitInput = validator(
  ["session", "username"],
  (value) => session(value) && username(value.username),
  "Expected a username.",
);

const addExampleInput = validator(
  ["session", "association", "item", "role", "note", "qualities"],
  (value) => session(value)
    && identity(value.association)
    && catalogTrack(value.item)
    && exampleRole(value.role)
    && note(value.note)
    && pickedQualities(value.qualities),
  "Expected a word, a track from the library, a role, a note, and up to five offered qualities.",
);

const updateExampleInput = validator(
  ["session", "annotation", "role", "note", "qualities"],
  (value) => session(value)
    && identity(value.annotation)
    && exampleRole(value.role)
    && note(value.note)
    && pickedQualities(value.qualities),
  "Expected an example, a role, a note, and up to five offered qualities.",
);

const exampleVisibilityInput = validator(
  ["session", "annotation", "visibility"],
  (value) => session(value) && identity(value.annotation) && (value.visibility === "PRIVATE" || value.visibility === "SHARED"),
  "Expected an example and a visibility.",
);

const exampleInput = validator(
  ["session", "annotation"],
  (value) => session(value) && identity(value.annotation),
  "Expected an example.",
);

/**
 * A word as read after a write that refers to it: its label, or null when it no longer exists.
 * Endpoints that write into a word return this so their answer cannot claim a removed word kept it.
 */
export const WordAfterWrite = former(
  "the word (association) after a write",
  ({ association }, { label }) => where(whether(Associating._get({ association }).is({ label }))).form({ label }),
);

/** Every word the signed-in person has, with its examples and the suggestions made for it. */
const PersonalWall = former(
  "the personal sound wall (user)",
  ({ user }, {
    association, label, description, visibility,
    annotation, item, role, note, qualities, exampleVisibility,
    pitch, contributor, contributorName, pitchedItem, pitchNote, fit, response,
  }) =>
    form({
      words: each(Associating._byUser({ user }).is({ association, label, description, visibility }))
        .arranged(label)
        .form({
          association,
          label,
          description,
          visibility,
          examples: each(Annotating._forContext({ context: association }).is({
            annotation, item, role, note, qualities, visibility: exampleVisibility,
          })).arranged(annotation).form({ annotation, item, role, note, qualities, visibility: exampleVisibility }),
          suggestions: each(Pitching._forTarget({ target: association }).is({
            pitch, contributor, item: pitchedItem, note: pitchNote, fit, response,
          }))
            .where(Registering._username({ user: contributor }).is({ username: contributorName }))
            .arranged(pitch)
            .form({ pitch, contributor: contributorName, item: pitchedItem, note: pitchNote, fit, response }),
        }),
    }),
);

/**
 * What someone other than the owner sees of a wall: the words whose visibility is among `levels`,
 * each with only the examples marked shared. Friends and strangers read through this one former
 * with different levels, so the two views cannot drift apart. It never reads suggestions.
 */
export const VisibleWall = former(
  "the sound wall of (user) open to (levels)",
  ({ user, levels }, { association, label, description, visibility, annotation, item, role, note, qualities }) =>
    form({
      words: each(Associating._byUser({ user }).is({ association, label, description, visibility }))
        .where(is.among(visibility, levels))
        .arranged(label)
        .form({
          association,
          label,
          description,
          visibility,
          examples: each(Annotating._forContext({ context: association }).is({
            annotation, item, role, note, qualities, visibility: "SHARED",
          })).arranged(annotation).form({ annotation, item, role, note, qualities }),
        }),
    }),
);

const ListWall = endpoint("/wall/list", ({ session, user, at }) =>
  receive({ session })
    .where(compute(computations.currentInstant, {}, at))
    .then(Sessioning.use({ session, at }).responds({ subject: user }))
    .then(respond({ wall: PersonalWall({ user }) })), { input: { required: ["session"] }, validators: { input: sessionOnly } });

const Associate = endpoint("/wall/associate", ({ session, user, label, description, visibility, association, at }) =>
  receive({ session, label, description, visibility })
    .where(compute(computations.currentInstant, {}, at))
    .then(Sessioning.use({ session, at }).responds({ subject: user }))
    .then(Associating.associate({ user, label, description, visibility }).responds({ association }))
    .then(respond({ association })), { input: { required: ["session", "label", "description", "visibility"] }, validators: { input: associateInput } });

const UpdateWord = endpoint("/wall/update", ({ session, user, association, label, description, at }) =>
  receive({ session, association, label, description })
    .where(compute(computations.currentInstant, {}, at))
    .then(Sessioning.use({ session, at }).responds({ subject: user }))
    .then(Associating.update({ user, association, label, description }).responds({}))
    .then(respond({})), { input: { required: ["session", "association", "label", "description"] }, validators: { input: updateInput } });

const SetVisibility = endpoint("/wall/visibility", ({ session, user, association, visibility, at }) =>
  receive({ session, association, visibility })
    .where(compute(computations.currentInstant, {}, at))
    .then(Sessioning.use({ session, at }).responds({ subject: user }))
    .then(Associating.setVisibility({ user, association, visibility }).responds({}))
    .then(respond({})), { input: { required: ["session", "association", "visibility"] }, validators: { input: visibilityInput } });

const RemoveWord = endpoint("/wall/remove", ({ session, user, association, at }) =>
  receive({ session, association })
    .where(compute(computations.currentInstant, {}, at))
    .then(Sessioning.use({ session, at }).responds({ subject: user }))
    .then(Associating.remove({ user, association }).responds({}))
    .then(Annotating.clearContext({ context: association }).responds({}))
    .then(Pitching.clearTarget({ target: association }).responds({}))
    .then(respond({})), { input: { required: ["session", "association"] }, validators: { input: associationInput } });

/**
 * Annotating accepts any context, so requiring the word to be the actor's own is decided here.
 * A word that is missing and a word that belongs to someone else get the same answer.
 *
 * The answer also reports the word as read after the write. If the owner removed it in between,
 * its label is null: the repair reaction below clears the write, and the interface says the song
 * was not kept. A label therefore means the word still existed after the song was stored, so any
 * later removal of the word clears the song as part of that removal.
 */
const AddExample = endpoint("/wall/examples/add", ({ session, user, association, item, role, note, qualities, annotation, at }) =>
  receive({ session, association, item, role, note, qualities })
    .where(compute(computations.currentInstant, {}, at))
    .then(Sessioning.use({ session, at }).responds({ subject: user }))
    .then(
      where(Associating._get({ association }).is({ user }))
        .then(Annotating.annotate({ author: user, item, context: association, role, note, qualities }).responds({ annotation }))
        .then(respond({ annotation, word: WordAfterWrite({ association }) }))
        .named("own-word"),
      where(no(Associating._get({ association }).is({ user })))
        .then(respond({ error: "WORD_NOT_FOUND" }))
        .named("not-own-word"),
    ), { input: { required: ["session", "association", "item", "role", "note", "qualities"] }, validators: { input: addExampleInput } });

/**
 * Annotating enforces its own author rule, and only a word's owner ever authors an example in it.
 * These endpoints pass the session's user as the author and let the concept answer.
 */
const UpdateExample = endpoint("/wall/examples/update", ({ session, user, annotation, role, note, qualities, at }) =>
  receive({ session, annotation, role, note, qualities })
    .where(compute(computations.currentInstant, {}, at))
    .then(Sessioning.use({ session, at }).responds({ subject: user }))
    .then(Annotating.update({ author: user, annotation, role, note, qualities }).responds({}))
    .then(respond({})), { input: { required: ["session", "annotation", "role", "note", "qualities"] }, validators: { input: updateExampleInput } });

const SetExampleVisibility = endpoint("/wall/examples/visibility", ({ session, user, annotation, visibility, at }) =>
  receive({ session, annotation, visibility })
    .where(compute(computations.currentInstant, {}, at))
    .then(Sessioning.use({ session, at }).responds({ subject: user }))
    .then(Annotating.setVisibility({ author: user, annotation, visibility }).responds({}))
    .then(respond({})), { input: { required: ["session", "annotation", "visibility"] }, validators: { input: exampleVisibilityInput } });

const RemoveExample = endpoint("/wall/examples/remove", ({ session, user, annotation, at }) =>
  receive({ session, annotation })
    .where(compute(computations.currentInstant, {}, at))
    .then(Sessioning.use({ session, at }).responds({ subject: user }))
    .then(Annotating.remove({ author: user, annotation }).responds({}))
    .then(respond({})), { input: { required: ["session", "annotation"] }, validators: { input: exampleInput } });

/**
 * Repairs the one relation no single concept owns: an example refers to a word that exists.
 * An add can read its word just before the owner removes it and write just after the cleanup.
 * Clearing a context is idempotent, so running it again here is safe.
 */
const ClearExamplesOfMissingWord = reaction(({ context }) =>
  when(Annotating.annotate({ context }).responds({}))
    .where(no(Associating._get({ association: context })))
    .then(Annotating.clearContext({ context })));

const ReadPublicWall = endpoint("/wall/public", ({ username, user, name }) =>
  receive({ username })
    .where(Registering._byUsername({ username }).is({ user, username: name }))
    .then(respond({ owner: name, wall: VisibleWall({ user, levels: FOR_ANYONE }) })), { input: { required: ["username"] }, validators: { input: publicInput } });

const MissingWall = endpoint("/wall/public", ({ username }) =>
  receive({ username })
    .where(no(Registering._byUsername({ username })))
    .then(respond({ error: "WALL_NOT_FOUND" })));

/**
 * A signed-in person opening someone's wall. Friending says whether the two are friends; that
 * decides which words the same former returns.
 */
const VisitWall = endpoint("/wall/visit", ({ session, username, user, owner, name, at }) =>
  receive({ session, username })
    .where(compute(computations.currentInstant, {}, at))
    .then(Sessioning.use({ session, at }).responds({ subject: user }))
    .then(
      where(
        Registering._byUsername({ username }).is({ user: owner, username: name }),
        Friending._friendship({ person: user, other: owner }),
      )
        .then(respond({ owner: name, wall: VisibleWall({ user: owner, levels: FOR_FRIENDS }) }))
        .named("friend"),
      where(
        Registering._byUsername({ username }).is({ user: owner, username: name }),
        no(Friending._friendship({ person: user, other: owner })),
      )
        .then(respond({ owner: name, wall: VisibleWall({ user: owner, levels: FOR_ANYONE }) }))
        .named("not-friend"),
      where(no(Registering._byUsername({ username })))
        .then(respond({ error: "WALL_NOT_FOUND" }))
        .named("no-wall"),
    ), { input: { required: ["session", "username"] }, validators: { input: visitInput } });

/** The owner's own wall as friends and as everyone else receive it, from the former they read through. */
const PreviewWall = endpoint("/wall/preview", ({ session, user, at }) =>
  receive({ session })
    .where(compute(computations.currentInstant, {}, at))
    .then(Sessioning.use({ session, at }).responds({ subject: user }))
    .then(respond({
      friends: VisibleWall({ user, levels: FOR_FRIENDS }),
      anyone: VisibleWall({ user, levels: FOR_ANYONE }),
    })), { input: { required: ["session"] }, validators: { input: sessionOnly } });

export const composition = {
  Definitions: { Associate, UpdateWord, SetVisibility, RemoveWord },
  Examples: { AddExample, WordAfterWrite, UpdateExample, SetExampleVisibility, RemoveExample, ClearExamplesOfMissingWord },
  Reading: { ListWall, PersonalWall, ReadPublicWall, MissingWall, VisitWall, PreviewWall, VisibleWall },
};
