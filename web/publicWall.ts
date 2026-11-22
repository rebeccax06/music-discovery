import { ref } from "vue/dist/vue.esm-bundler.js";
import { api } from "./api.ts";
import { explain } from "./messages.ts";
import type { PublicWall } from "./types.ts";

/**
 * Another person's wall, addressed by username. Signed out, it holds the public words. Signed in, the
 * server also includes words limited to friends when the two people are friends.
 */
export function usePublicWall(signedIn: () => boolean) {
  const wall = ref<PublicWall | null>(null);
  const loading = ref(false);
  const error = ref("");
  const missing = ref(false);
  let wanted = "";

  async function load(username: string, options: { quiet?: boolean } = {}) {
    wanted = username;
    if (!options.quiet) {
      loading.value = true;
      wall.value = null;
    }
    error.value = "";
    missing.value = false;
    try {
      const result = signedIn() ? await api.wall.visit({ username }) : await api.wall.public({ username });
      if (wanted !== username) return;
      if ("error" in result && result.error === "UNAUTHORIZED") {
        // The session ended; what anyone may see is still worth showing.
        const open = await api.wall.public({ username });
        if (wanted === username && !("error" in open)) wall.value = open;
        return;
      }
      if ("error" in result) {
        wall.value = null;
        missing.value = result.error === "NOT_FOUND";
        error.value = explain("loadPublicWall", result.error);
      } else {
        wall.value = result;
      }
    } catch {
      if (wanted === username) error.value = explain("loadPublicWall", "NETWORK_ERROR");
    } finally {
      if (wanted === username) loading.value = false;
    }
  }

  return { wall, loading, error, missing, load };
}

export type Visited = ReturnType<typeof usePublicWall>;
