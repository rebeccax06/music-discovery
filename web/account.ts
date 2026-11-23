import { ref } from "vue/dist/vue.esm-bundler.js";
import { api } from "./api.ts";
import type { Account } from "./types.ts";

const unreachable = "Could not reach Sound It Out. Check your connection and try again.";

/**
 * How creating an account ended. Nothing when the person is now signed in. `refused` when no account
 * was created and the same form can be corrected and sent again. `recover` when the account may exist
 * already, so the form should switch to signing in with the same username.
 */
export type RegisterOutcome = { refused: string } | { recover: string } | undefined;

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

  /**
   * Signing in or registering answers only with the user; the display username comes from Me. The
   * account is set only once both are known, so a failed read never leaves the page half signed in.
   */
  async function loadSignedIn() {
    try {
      const result = await api.auth.me({});
      if ("error" in result) return false;
      account.value = result;
      return true;
    } catch {
      return false;
    }
  }

  async function register(username: string, password: string): Promise<RegisterOutcome> {
    try {
      const result = await api.auth.register({ username, password });
      if ("error" in result) {
        if (result.error === "CONFLICT") return { refused: "That username is taken. Choose another or sign in." };
        if (result.error === "INVALID_REQUEST") return { refused: "Check your username and password and try again." };
        return { recover: "Your account may have been created. Sign in with this username to continue." };
      }
    } catch {
      return { recover: "Could not reach Sound It Out, but your account may have been created. Sign in with this username to continue." };
    }
    if (!(await loadSignedIn())) {
      return { recover: "Your account was created, but Sound It Out could not finish signing you in. Sign in to continue." };
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
    } catch {
      return unreachable;
    }
    if (!(await loadSignedIn())) return "Could not finish signing you in. Try again.";
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
