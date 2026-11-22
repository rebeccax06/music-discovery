import { ref } from "vue/dist/vue.esm-bundler.js";
import { api } from "./api.ts";

export type Visibility = "PRIVATE" | "PUBLIC";

export type Example = {
  annotation: string;
  author?: string;
  item: string;
  role: string;
  note: string;
  visibility?: string;
};

export type Word = {
  association: string;
  label: string;
  description: string;
  visibility: Visibility;
  examples: Example[];
};

export type SharedWord = {
  association: string;
  label: string;
  description: string;
  examples: Array<{
    annotation: string;
    item: string;
    role: string;
    note: string;
  }>;
};

export type SharedWall = { owner: string; words: SharedWord[] };

export function wallUrl(username: string) {
  const url = new URL("/", location.href);
  url.searchParams.set("wall", username);
  return url.toString();
}

const messages: Record<string, string> = {
  CONFLICT: "You have already defined this word.",
  INVALID_REQUEST: "Check the word and description and try again.",
  FORBIDDEN: "You cannot change another user's definition.",
  NOT_FOUND: "This word could not be found.",
  UNAUTHORIZED: "Sign in to continue.",
  NETWORK_ERROR:
    "Could not reach Sound It Out. Check your connection and try again.",
};

function explain(error: string, fallback: string) {
  return messages[error] ?? fallback;
}

function requestedWall() {
  return new URLSearchParams(location.search).get("wall")?.trim() || null;
}

export function useWall() {
  const words = ref<Word[]>([]);
  const loading = ref(false);
  const loadError = ref("");
  const publicWall = ref<SharedWall | null>(null);
  const wallUnavailable = ref(false);
  const openId = ref<string | null>(null);
  let owner: string | null = null;

  async function load(options?: { quiet?: boolean }) {
    if (!owner) {
      words.value = [];
      return;
    }
    if (!options?.quiet) loading.value = true;
    loadError.value = "";
    try {
      const result = await api.wall.list({});
      if ("error" in result)
        loadError.value = explain(
          result.error,
          "Could not load your Sound Wall. Try again.",
        );
      else words.value = result.wall.words;
    } catch {
      loadError.value = "Could not load your Sound Wall. Try again.";
    } finally {
      loading.value = false;
    }
  }

  async function loadPublic(username: string) {
    try {
      const result = await api.wall.public({ username });
      if ("error" in result) {
        publicWall.value = null;
        wallUnavailable.value = true;
      } else {
        publicWall.value = { owner: result.owner, words: result.wall.words };
        wallUnavailable.value = false;
      }
    } catch {
      publicWall.value = null;
      wallUnavailable.value = true;
    }
  }

  async function open(account: { user: string; username: string } | null) {
    owner = account?.user ?? null;
    openId.value = null;
    publicWall.value = null;
    wallUnavailable.value = false;
    await load();
    const requested = requestedWall();
    if (!requested) return;
    if (account && requested.toLowerCase() === account.username.toLowerCase()) {
      showOwnWall();
      return;
    }
    await loadPublic(requested);
  }

  function showOwnWall() {
    const url = new URL(location.href);
    url.searchParams.delete("wall");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    publicWall.value = null;
    wallUnavailable.value = false;
  }

  async function createWord(
    label: string,
    description: string,
    visibility: Visibility,
  ) {
    const result = await api.wall.associate({ label, description, visibility });
    if ("error" in result)
      return explain(result.error, "Could not add that word. Try again.");
    openId.value = result.association;
    await load({ quiet: true });
  }

  async function saveWord(
    association: string,
    label: string,
    description: string,
  ) {
    const result = await api.wall.update({ association, label, description });
    if ("error" in result)
      return explain(result.error, "Could not save that word. Try again.");
    await load({ quiet: true });
  }

  async function setVisibility(association: string, visibility: Visibility) {
    const result = await api.wall.visibility({ association, visibility });
    if ("error" in result)
      return explain(
        result.error,
        "Could not update who can open this word. Try again.",
      );
    await load({ quiet: true });
  }

  async function removeWord(association: string) {
    const result = await api.wall.remove({ association });
    if ("error" in result)
      return explain(result.error, "Could not remove that word. Try again.");
    if (openId.value === association) openId.value = null;
    await load({ quiet: true });
  }

  return {
    words,
    loading,
    loadError,
    publicWall,
    wallUnavailable,
    openId,
    open,
    load,
    showOwnWall,
    createWord,
    saveWord,
    setVisibility,
    removeWord,
  };
}
