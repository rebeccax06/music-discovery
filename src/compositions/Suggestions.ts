import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, no, reaction, view, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { WordAfterWrite } from "./SoundWall.ts";
import { boundedText, catalogTrack, identity, note, pickedQualities, session, validator } from "./validators.ts";

const { Annotating, Associating, Friending, Pitching, UserAuthenticating } = concepts;

const MAX_RESPONSE = 280;

const sessionOnly = validator(["session"], session, "Expected a session.");

const sendInput = validator(
  ["session", "association", "item", "note"],
  (value) => session(value) && identity(value.association) && catalogTrack(value.item) && note(value.note),
  "Expected a word, a track from the library, and a note.",
);

const pitchInput = validator(
  ["session", "pitch"],
  (value) => session(value) && identity(value.pitch),
  "Expected a suggestion.",
);

const reviewInput = validator(
  ["session", "pitch", "fit", "response"],
  (value) => session(value)
    && identity(value.pitch)
    && (value.fit === "MATCH" || value.fit === "PARTIAL" || value.fit === "MISS")
    && boundedText(value.response, MAX_RESPONSE),
  "Expected a suggestion, a fit, and a response.",
);

const promoteInput = validator(
  ["session", "pitch", "note", "qualities"],
  (value) => session(value) && identity(value.pitch) && note(value.note) && pickedQualities(value.qualities),
  "Expected a suggestion, a note, and up to five offered qualities.",
);

/** A word limited to its owner's friends, opened by one of them. */
const friendsWord = view(
  "(association) is a friends' word that (viewer) may open",
  ({ association, viewer }, _outputs, { owner }) =>
    where(
      Associating._get({ association }).is({ user: owner, visibility: "LIMITED" }),
      Friending._friendship({ person: viewer, other: owner }),
    ),
).holds();

/** What a contributor may see of their own suggestions: never the fit or the response. */
const SuggestionsSent = former(
  "the suggestions (user) has sent",
  ({ user }, { pitch, recipient, to, target, item, note, reviewed }) =>
    each(Pitching._sentBy({ contributor: user }).is({ pitch, recipient, target, item, note, reviewed }))
      .where(UserAuthenticating._username({ user: recipient }).is({ username: to }))
      .arranged(pitch)
      .form({ pitch, to, word: target, item, note, reviewed }),
);

/**
 * Pitching accepts any target, so who may suggest is decided here: anyone signed in for a public
 * word, and the owner's friends for a friends' word. A word the person may not open and a word that
 * does not exist get the same answer. Whether the song is already a private example is deliberately
 * not checked: refusing would tell the contributor that the example exists.
 */
const Send = endpoint("/suggestions/send", ({ session, user, association, item, note, owner, pitch }) =>
  receive({ session, association, item, note })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(
      where(Associating._get({ association }).is({ user: owner, visibility: "PUBLIC" }))
        .then(Pitching.pitch({ contributor: user, recipient: owner, target: association, item, note }).responds({ pitch }))
        .then(respond({ pitch, word: WordAfterWrite({ association }) }))
        .named("public-word"),
      where(
        Associating._get({ association }).is({ user: owner, visibility: "LIMITED" }),
        Friending._friendship({ person: user, other: owner }),
      )
        .then(Pitching.pitch({ contributor: user, recipient: owner, target: association, item, note }).responds({ pitch }))
        .then(respond({ pitch, word: WordAfterWrite({ association }) }))
        .named("friends-word"),
      where(
        no(Associating._get({ association }).is({ visibility: "PUBLIC" })),
        no(friendsWord({ association, viewer: user })),
      )
        .then(respond({ error: "WORD_NOT_FOUND" }))
        .named("no-open-word"),
    ), { input: { required: ["session", "association", "item", "note"] }, validators: { input: sendInput } });

const ListSent = endpoint("/suggestions/sent", ({ session, user }) =>
  receive({ session })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(respond({ suggestions: SuggestionsSent({ user }) })), { input: { required: ["session"] }, validators: { input: sessionOnly } });

/** Pitching enforces who may withdraw and who may review; these endpoints supply the session's user. */
const Withdraw = endpoint("/suggestions/withdraw", ({ session, user, pitch }) =>
  receive({ session, pitch })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(Pitching.withdraw({ contributor: user, pitch }).responds({}))
    .then(respond({})), { input: { required: ["session", "pitch"] }, validators: { input: pitchInput } });

const Review = endpoint("/suggestions/review", ({ session, user, pitch, fit, response }) =>
  receive({ session, pitch, fit, response })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(Pitching.review({ recipient: user, pitch, fit, response }).responds({}))
    .then(respond({})), { input: { required: ["session", "pitch", "fit", "response"] }, validators: { input: reviewInput } });

/**
 * Adds a reviewed match to the recipient's examples, as a separate step from reviewing it.
 * Annotating allows one annotation per word and song, so promoting twice adds once.
 */
const Promote = endpoint("/suggestions/promote", ({ session, user, pitch, note, qualities, target, item, annotation }) =>
  receive({ session, pitch, note, qualities })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(
      where(Pitching._get({ pitch }).is({ recipient: user, target, item, fit: "MATCH" }))
        .then(Annotating.annotate({ author: user, item, context: target, role: "EXAMPLE", note, qualities }).responds({ annotation }))
        .then(respond({ annotation, word: WordAfterWrite({ association: target }) }))
        .named("own-match"),
      where(no(Pitching._get({ pitch }).is({ recipient: user, fit: "MATCH" })))
        .then(respond({ error: "NOT_A_MATCH" }))
        .named("not-own-match"),
    ), { input: { required: ["session", "pitch", "note", "qualities"] }, validators: { input: promoteInput } });

/** The counterpart of the example repair in the Sound Wall: a suggestion refers to a word that exists. */
const ClearSuggestionsOfMissingWord = reaction(({ target }) =>
  when(Pitching.pitch({ target }).responds({}))
    .where(no(Associating._get({ association: target })))
    .then(Pitching.clearTarget({ target })));

export const composition = {
  Sending: { Send, friendsWord, ListSent, SuggestionsSent, Withdraw, ClearSuggestionsOfMissingWord },
  Reviewing: { Review, Promote },
};
