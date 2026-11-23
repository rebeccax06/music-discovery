import { ref } from "vue/dist/vue.esm-bundler.js";
import { api } from "./api.ts";
import { explain, type Action } from "./messages.ts";
import type { Audience, Example, Failure, Fit, PublicWord, Word } from "./types.ts";

/**
 * The signed-in person's words, their songs, and the suggestions made for them. Every action
 * answers with nothing on success or a sentence on failure, and reloads the wall after a change so
 * the page shows what the server holds.
 */
export function useWall(sessionEnded: () => void) {
  const words = ref<Word[]>([]);
  const loading = ref(false);
  const loadError = ref("");

  async function load(options: { quiet?: boolean } = {}) {
    if (!options.quiet) loading.value = true;
    loadError.value = "";
    try {
      const result = await api.wall.list({});
      if ("error" in result) {
        if (result.error === "UNAUTHORIZED") sessionEnded();
        loadError.value = explain("loadWall", result.error);
      } else {
        words.value = result.wall.words;
      }
    } catch {
      loadError.value = explain("loadWall", "NETWORK_ERROR");
    } finally {
      loading.value = false;
    }
  }

  function clear() {
    words.value = [];
    loadError.value = "";
  }

  async function change(action: Action, request: () => Promise<object>): Promise<Failure> {
    let failure: Failure;
    try {
      const result: Record<string, unknown> = await request() as Record<string, unknown>;
      if ("error" in result) {
        if (result.error === "UNAUTHORIZED") sessionEnded();
        return explain(action, String(result.error));
      }
      // A write into a word reports the word as read afterward. No label: the word was removed meanwhile.
      const word = result.word as { label: string | null } | undefined;
      if (word && word.label === null) failure = explain(action, "WORD_REMOVED");
    } catch {
      return explain(action, "NETWORK_ERROR");
    }
    await load({ quiet: true });
    return failure;
  }

  const createWord = (label: string) =>
    change("createWord", () => api.wall.associate({ label, description: "", visibility: "PRIVATE" }));
  const saveWord = (association: string, label: string, description: string) =>
    change("saveWord", () => api.wall.update({ association, label, description }));
  const setWordVisibility = (association: string, visibility: Audience) =>
    change("shareWord", () => api.wall.visibility({ association, visibility }));
  const removeWord = (association: string) =>
    change("removeWord", () => api.wall.remove({ association }));

  const addExample = (association: string, item: string, qualities: string[], note: string) =>
    change("addExample", () => api.wall.examples.add({ association, item, role: "EXAMPLE", note, qualities }));
  const saveExample = (example: Example, qualities: string[], note: string) =>
    change("saveExample", () => api.wall.examples.update({ annotation: example.annotation, role: example.role, note, qualities }));
  const setExampleVisibility = (annotation: string, visibility: Example["visibility"]) =>
    change("shareExample", () => api.wall.examples.visibility({ annotation, visibility }));
  const removeExample = (annotation: string) =>
    change("removeExample", () => api.wall.examples.remove({ annotation }));

  const review = (pitch: string, fit: Fit, response: string) =>
    change("review", () => api.suggestions.review({ pitch, fit, response }));
  const promote = (pitch: string, qualities: string[], note: string) =>
    change("promote", () => api.suggestions.promote({ pitch, note, qualities }));

  /**
   * Narrow access before sharing any songs. When opening a word to more people, share the songs
   * before changing the audience so the new audience sees the intended examples when it gets access.
   */
  async function shareAllAndOpen(word: Word, audience: Exclude<Audience, "PRIVATE">): Promise<Failure> {
    const narrowFirst = word.visibility === "PUBLIC" && audience === "LIMITED";
    if (narrowFirst) {
      const failure = await setWordVisibility(word.association, audience);
      if (failure) return failure;
    }

    const unshared = word.examples.filter(example => example.visibility !== "SHARED");
    let done = 0;
    for (const example of unshared) {
      const failure = await setExampleVisibility(example.annotation, "SHARED");
      if (failure) {
        return `${failure} Confirmed ${done} of ${unshared.length} song sharing changes.`;
      }
      done += 1;
    }

    if (narrowFirst) return;
    const failure = await setWordVisibility(word.association, audience);
    if (failure) return `${failure} Your song sharing settings were saved. Check who can open the word before trying again.`;
  }

  /** One of this person's words as their friends and as everyone else receive it, from the server. */
  async function preview(association: string): Promise<{ friends: PublicWord | null; anyone: PublicWord | null } | Failure> {
    try {
      const result = await api.wall.preview({});
      if ("error" in result) {
        if (result.error === "UNAUTHORIZED") sessionEnded();
        return explain("loadPublicWall", result.error);
      }
      const find = (words: PublicWord[]) => words.find(word => word.association === association) ?? null;
      return { friends: find(result.friends.words), anyone: find(result.anyone.words) };
    } catch {
      return explain("loadPublicWall", "NETWORK_ERROR");
    }
  }

  return {
    words, loading, loadError, load, clear,
    createWord, saveWord, setWordVisibility, removeWord,
    addExample, saveExample, setExampleVisibility, removeExample,
    review, promote, shareAllAndOpen, preview,
  };
}

export type Wall = ReturnType<typeof useWall>;
