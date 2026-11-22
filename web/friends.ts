import { computed, ref } from "vue/dist/vue.esm-bundler.js";
import { api } from "./api.ts";
import { explain, type Action } from "./messages.ts";
import type { Circle, Failure } from "./types.ts";

export type Standing = "self" | "friend" | "sent" | "received" | "none";

const empty: Circle = { friends: [], received: [], sent: [] };

/** The signed-in person's friends, each with the words they have opened to them, and waiting requests. */
export function useFriends(sessionEnded: () => void) {
  const circle = ref<Circle>(empty);
  const loaded = ref(false);
  const loadError = ref("");
  const waiting = computed(() => circle.value.received.length);

  async function load() {
    loadError.value = "";
    try {
      const result = await api.friends.list({});
      if ("error" in result) {
        if (result.error === "UNAUTHORIZED") sessionEnded();
        loadError.value = explain("loadFriends", result.error);
      } else {
        circle.value = result.circle;
        loaded.value = true;
      }
    } catch {
      loadError.value = explain("loadFriends", "NETWORK_ERROR");
    }
  }

  function clear() {
    circle.value = empty;
    loaded.value = false;
    loadError.value = "";
  }

  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  /** Where the signed-in person stands with `username`, as far as the loaded circle says. */
  function standing(me: string, username: string): Standing {
    if (same(me, username)) return "self";
    if (circle.value.friends.some(friend => same(friend.username, username))) return "friend";
    if (circle.value.sent.some(person => same(person.username, username))) return "sent";
    if (circle.value.received.some(person => same(person.username, username))) return "received";
    return "none";
  }

  async function change(action: Action, request: () => Promise<object>): Promise<Failure> {
    let failure: Failure;
    try {
      const result = await request();
      if ("error" in result) {
        if (result.error === "UNAUTHORIZED") sessionEnded();
        failure = explain(action, String(result.error));
      }
    } catch {
      return explain(action, "NETWORK_ERROR");
    }
    // Reload either way: a refusal usually means the circle on screen was out of date.
    await load();
    return failure;
  }

  const request = (username: string) => change("befriend", () => api.friends.request({ username }));
  const accept = (username: string) => change("answerFriend", () => api.friends.accept({ username }));
  const decline = (username: string) => change("answerFriend", () => api.friends.decline({ username }));
  const cancel = (username: string) => change("answerFriend", () => api.friends.cancel({ username }));
  const remove = (username: string) => change("unfriend", () => api.friends.remove({ username }));

  return { circle, loaded, loadError, waiting, load, clear, standing, request, accept, decline, cancel, remove };
}

export type Friends = ReturnType<typeof useFriends>;
