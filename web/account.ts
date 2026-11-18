import { ref } from "vue/dist/vue.esm-bundler.js";
import type { SoundItOutWireHttp } from "../generated/wire.ts";
import { api } from "./api.ts";

type Account = SoundItOutWireHttp["/auth/me"]["output"];

export function useAccount() {
  const account = ref<Account | null>(null);
  const restoring = ref(true);
  const restoreError = ref("");

  async function restore() {
    restoring.value = true;
    restoreError.value = "";
    try {
      const result = await api.auth.me({});
      if (!("error" in result)) account.value = result;
      else if (result.error !== "UNAUTHORIZED") restoreError.value = "Could not check your session. Try again.";
    } catch {
      restoreError.value = "Could not check your session. Try again.";
    } finally {
      restoring.value = false;
    }
  }

  async function signIn(username: string, password: string) {
    const result = await api.auth.login({ username, password });
    if ("error" in result) return result.error;
    account.value = result;
  }

  async function signOut() {
    const result = await api.auth.logout({});
    if ("error" in result && result.error !== "UNAUTHORIZED") return result.error;
    account.value = null;
  }

  return { account, restoring, restoreError, restore, signIn, signOut };
}
