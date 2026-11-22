import { MAX_DESCRIPTION, MAX_NOTE, MAX_WORD } from "../shared/limits.ts";

/**
 * What each action says when it fails. The server answers with a category such as CONFLICT, and a
 * category means something different for each action, so every action has its own table.
 */
const messages = {
  loadWall: { fallback: "Could not load your Sound Wall. Try again." },
  createWord: {
    CONFLICT: "You already have this word.",
    INVALID_REQUEST: `Use a word of 1 to ${MAX_WORD} characters.`,
    fallback: "Could not add that word. Nothing was saved. Try again.",
  },
  saveWord: {
    CONFLICT: "You already have a word with that name.",
    INVALID_REQUEST: `Use a word of 1 to ${MAX_WORD} characters and a description of up to ${MAX_DESCRIPTION}.`,
    NOT_FOUND: "This word no longer exists.",
    FORBIDDEN: "You can only change your own words.",
    fallback: "Could not save your changes. Try again.",
  },
  shareWord: {
    NOT_FOUND: "This word no longer exists.",
    FORBIDDEN: "You can only change your own words.",
    fallback: "Could not change who can open this word. Nothing changed. Try again.",
  },
  removeWord: {
    NOT_FOUND: "This word was already removed.",
    FORBIDDEN: "You can only remove your own words.",
    fallback: "Could not remove this word. Nothing was removed. Try again.",
  },
  addExample: {
    CONFLICT: "That song is already in this word.",
    INVALID_REQUEST: `Pick up to five qualities and keep the note under ${MAX_NOTE} characters.`,
    NOT_FOUND: "This word no longer exists.",
    WORD_REMOVED: "This word was just removed, so the song was not kept.",
    fallback: "Could not add that song. Your picks are still here. Try again.",
  },
  saveExample: {
    INVALID_REQUEST: `Pick up to five qualities and keep the note under ${MAX_NOTE} characters.`,
    NOT_FOUND: "This song is no longer in the word.",
    FORBIDDEN: "You can only change songs in your own words.",
    fallback: "Could not save your changes to this song. Try again.",
  },
  shareExample: {
    NOT_FOUND: "This song is no longer in the word.",
    FORBIDDEN: "You can only share songs in your own words.",
    fallback: "Could not change who can see this song. Nothing changed. Try again.",
  },
  removeExample: {
    NOT_FOUND: "This song was already removed.",
    FORBIDDEN: "You can only remove songs from your own words.",
    fallback: "Could not remove this song. Try again.",
  },
  review: {
    INVALID_REQUEST: "Choose how well it fits, and keep your note under 280 characters.",
    NOT_FOUND: "This suggestion was withdrawn.",
    FORBIDDEN: "Only the word's owner can review a suggestion.",
    fallback: "Could not save your review. Try again.",
  },
  promote: {
    CONFLICT: "This song is already one of your examples.",
    INVALID_REQUEST: `Pick up to five qualities and keep the note under ${MAX_NOTE} characters.`,
    NOT_FOUND: "Mark this suggestion as a match before adding it.",
    WORD_REMOVED: "This word was just removed, so the song was not kept.",
    fallback: "Could not add this song to your examples. Try again.",
  },
  loadPublicWall: {
    NOT_FOUND: "There is no Sound Wall at this address.",
    fallback: "Could not load this Sound Wall. Try again.",
  },
  suggest: {
    CONFLICT: "This song has already been suggested for this word. Pick another?",
    FORBIDDEN: "This is your own word. Add the song to it directly.",
    INVALID_REQUEST: `Keep your note under ${MAX_NOTE} characters.`,
    NOT_FOUND: "You can no longer open this word. Its owner may have made it private.",
    WORD_REMOVED: "This word was just removed, so your suggestion was not kept.",
    fallback: "Could not send your suggestion. Your pick is still here. Try again.",
  },
  loadSent: { fallback: "Could not load your suggestions. Try again." },
  loadFriends: { fallback: "Could not load your friends. Try again." },
  befriend: {
    CONFLICT: "You already asked, or you are already friends. Check your requests below.",
    INVALID_REQUEST: "That is your own username.",
    NOT_FOUND: "There is nobody with that username. Check the spelling.",
    fallback: "Could not send the friend request. Try again.",
  },
  answerFriend: {
    NOT_FOUND: "This request is no longer waiting. It may have been cancelled.",
    fallback: "Could not answer the request. Try again.",
  },
  unfriend: {
    NOT_FOUND: "You are no longer friends.",
    fallback: "Could not remove this friend. Try again.",
  },
  withdraw: {
    CONFLICT: "This suggestion has already been reviewed, so it can no longer be withdrawn.",
    NOT_FOUND: "This suggestion is already gone.",
    fallback: "Could not withdraw your suggestion. Try again.",
  },
} satisfies Record<string, Record<string, string> & { fallback: string }>;

const everywhere: Record<string, string> = {
  NETWORK_ERROR: "Could not reach Sound It Out. Check your connection and try again.",
  UNAUTHORIZED: "Your session has ended. Sign in again to continue; what you entered is still here.",
};

export type Action = keyof typeof messages;

export function explain(action: Action, error: string) {
  const table: Record<string, string> = messages[action];
  return table[error] ?? everywhere[error] ?? table.fallback;
}
