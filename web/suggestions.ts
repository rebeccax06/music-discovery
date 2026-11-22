import { ref } from "vue/dist/vue.esm-bundler.js";
import { api } from "./api.ts";
import { explain } from "./messages.ts";
import type { Failure, SentSuggestion } from "./types.ts";

/** Every suggestion the signed-in person has sent, with whether each has been reviewed. */
export function useSuggestions(sessionEnded: () => void) {
  const sent = ref<SentSuggestion[]>([]);
  const sentError = ref("");

  async function loadSent() {
    sentError.value = "";
    try {
      const result = await api.suggestions.sent({});
      if ("error" in result) {
        if (result.error === "UNAUTHORIZED") sessionEnded();
        sentError.value = explain("loadSent", result.error);
      } else {
        sent.value = result.suggestions;
      }
    } catch {
      sentError.value = explain("loadSent", "NETWORK_ERROR");
    }
  }

  function clear() {
    sent.value = [];
    sentError.value = "";
  }

  async function send(association: string, item: string, note: string): Promise<Failure> {
    let failure: Failure;
    try {
      const result = await api.suggestions.send({ association, item, note });
      if ("error" in result) {
        if (result.error === "UNAUTHORIZED") sessionEnded();
        return explain("suggest", result.error);
      }
      if (result.word.label === null) failure = explain("suggest", "WORD_REMOVED");
    } catch {
      return explain("suggest", "NETWORK_ERROR");
    }
    await loadSent();
    return failure;
  }

  async function withdraw(pitch: string): Promise<Failure> {
    let failure: Failure;
    try {
      const result = await api.suggestions.withdraw({ pitch });
      if ("error" in result) {
        if (result.error === "UNAUTHORIZED") sessionEnded();
        failure = explain("withdraw", result.error);
      }
    } catch {
      return explain("withdraw", "NETWORK_ERROR");
    }
    // Reload either way: a refusal usually means the list on screen was out of date.
    await loadSent();
    return failure;
  }

  return { sent, sentError, loadSent, clear, send, withdraw };
}

export type Suggestions = ReturnType<typeof useSuggestions>;
