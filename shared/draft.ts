import { qualityOrder, qualityPhrase } from "./qualities.ts";

export type DraftExample = { role: string; qualities: readonly string[] };
export type DraftReader = { owner: true } | { owner: false; name: string };

const MOST_NAMED = 4;

function joined(items: readonly string[], last: "and" | "or") {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${last} ${items.at(-1)}`;
}

/**
 * The qualities a draft would name, most common first. Only examples (not counterexamples) with at
 * least one quality count. Ties fall back to vocabulary order, so the result does not depend on the
 * order the examples arrive in.
 */
export function rankedQualities(examples: readonly DraftExample[]) {
  const counted = examples.filter(example => example.role === "EXAMPLE" && example.qualities.length > 0);
  const counts = new Map<string, number>();
  for (const example of counted) {
    for (const quality of new Set(example.qualities)) counts.set(quality, (counts.get(quality) ?? 0) + 1);
  }
  const ranked = [...counts.entries()]
    .sort(([a, countA], [b, countB]) =>
      countB - countA || qualityOrder(a) - qualityOrder(b) || (a < b ? -1 : a > b ? 1 : 0))
    .map(([quality, count]) => ({ quality, count }));
  return { ranked, examples: counted.length };
}

/**
 * A one-sentence description built only from the qualities picked for a word's examples, or null
 * when none were picked. It never writes anything: callers compute it from whatever they are showing.
 */
export function draft(label: string, examples: readonly DraftExample[], reader: DraftReader) {
  const { ranked, examples: counted } = rankedQualities(examples);
  if (!ranked.length) return null;

  const lead = `${reader.owner ? "For you" : `For ${reader.name}`}, “${label}”`;
  const usual = ranked.filter(({ count }) => counted === 1 || count * 2 > counted);
  const others = ranked.filter(entry => !usual.includes(entry));
  const phrases = (entries: typeof ranked) => entries.map(({ quality }) => qualityPhrase(quality));

  if (!usual.length) return `${lead} can mean ${joined(phrases(others.slice(0, MOST_NAMED)), "or")}.`;
  const named = usual.slice(0, MOST_NAMED);
  const alongside = others.slice(0, MOST_NAMED - named.length);
  if (!others.length) return `${lead} means ${joined(phrases(named), "and")}.`;
  if (!alongside.length) return `${lead} often means ${joined(phrases(named), "and")}.`;
  return `${lead} often means ${joined(phrases(named), "and")}, with ${joined(phrases(alongside), "or")}.`;
}
