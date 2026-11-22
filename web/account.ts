import { ref } from "vue/dist/vue.esm-bundler.js";
import { api } from "./api.ts";
import type { Account } from "./types.ts";

const unreachable = "Could not reach Sound It Out. Check your connection and try again.";

export function useAccount() {
  const account = ref<Account | null>(null);
  const restoreError = ref("");

  async function restore() {
    restoreError.value = "";
    try {
      const result = await api.auth.me({});
      if (!("error" in result)) account.value = result;
      else if (result.error !== "UNAUTHORIZED") restoreError.value = "Could not check your session. Try again.";
    } catch {
      restoreError.value = "Could not check your session. Try again.";
    }
  }

  async function register(username: string, password: string) {
    try {
      const result = await api.auth.register({ username, password });
      if (!("error" in result)) return;
      if (result.error === "CONFLICT") return "That username is taken. Choose another or sign in.";
      if (result.error === "INVALID_REQUEST") return "Check your username and password and try again.";
      return "Could not create your account. Try again.";
    } catch {
      return unreachable;
    }
  }

  async function signIn(username: string, password: string) {
    try {
      const result = await api.auth.login({ username, password });
      if ("error" in result) {
        return result.error === "UNAUTHORIZED"
          ? "The username or password is incorrect. Check both and try again."
          : "Could not sign in. Try again.";
      }
      account.value = result;
    } catch {
      return unreachable;
    }
  }

  async function signOut() {
    try {
      const result = await api.auth.logout({});
      if ("error" in result && result.error !== "UNAUTHORIZED") return "Could not sign out. Try again.";
      account.value = null;
    } catch {
      return "Could not sign out. Check your connection and try again.";
    }
  }

  return { account, restoreError, restore, register, signIn, signOut };
}

export type AccountActions = ReturnType<typeof useAccount>;
