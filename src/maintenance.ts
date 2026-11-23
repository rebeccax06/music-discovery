import type { assembleApplication } from "./assembly.ts";

type Concepts = ReturnType<typeof assembleApplication>["concepts"];

/**
 * Finds songs and suggestions whose word no longer exists and clears them.
 *
 * Removing a word clears what refers to it, and a repair reaction clears anything written just
 * after. If that repair itself fails, a row is left that no read can reach. This sweep is the
 * recovery for that case. It uses only the concepts' own queries and actions, and clearing is safe
 * at any time: word identities are never reused, so a context with no word can never gain one.
 */
export async function clearOrphans(concepts: Concepts) {
  const missing = async (association: string) => (await concepts.Associating._get({ association })).length === 0;
  let songs = 0;
  let suggestions = 0;
  for (const { context } of await concepts.Annotating._contexts({})) {
    if (!await missing(context)) continue;
    await concepts.Annotating.clearContext({ context });
    songs += 1;
  }
  for (const { target } of await concepts.Pitching._targets({})) {
    if (!await missing(target)) continue;
    await concepts.Pitching.clearTarget({ target });
    suggestions += 1;
  }
  return { songs, suggestions };
}
