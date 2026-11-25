import type { Example } from "./types.ts";

export function listeningNotePrompt(word: string, role: Example["role"] = "EXAMPLE") {
  const fit = role === "COUNTEREXAMPLE" ? "doesn’t fit" : "fits";
  return `Describe in your own words why this song ${fit} the word “${word}”`;
}
