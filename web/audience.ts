import type { Audience } from "./types.ts";

/** How each audience is named and explained wherever a person chooses or sees it. */
export const audiences: ReadonlyArray<{ value: Audience; label: string; short: string; explain: string }> = [
  { value: "PRIVATE", label: "Only you", short: "Private", explain: "Nobody else can open this word." },
  { value: "LIMITED", label: "Your friends", short: "Friends", explain: "Friends can open it from your wall or the Friends page and suggest songs. Nobody else can." },
  { value: "PUBLIC", label: "Anyone with the link", short: "Public", explain: "Anyone can open it, without an account. Signed-in visitors can suggest songs." },
];

export function audienceOf(value: Audience) {
  return audiences.find(audience => audience.value === value)!;
}
