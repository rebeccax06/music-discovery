import { computed, defineComponent, nextTick, ref, type PropType } from "vue/dist/vue.esm-bundler.js";
import { api } from "../api.ts";
import type { useAccount } from "../account.ts";

export default defineComponent({
  props: { signIn: { type: Function as PropType<ReturnType<typeof useAccount>["signIn"]>, required: true } },
  setup(props) {
    const creating = ref(false);
    const username = ref("");
    const password = ref("");
    const busy = ref(false);
    const error = ref("");
    const notice = ref("");
    const heading = ref<HTMLHeadingElement | null>(null);
    const title = computed(() => creating.value ? "Create account" : "Sign in");

    async function toggleMode() {
      creating.value = !creating.value;
      password.value = "";
      error.value = "";
      notice.value = "";
      await nextTick();
      heading.value?.focus();
    }

    async function submit() {
      if (busy.value) return;
      error.value = "";
      notice.value = "";
      const name = username.value.trim();
      const secret = password.value;
      if (!name || !secret) {
        error.value = "Enter your username and password.";
        return;
      }
      if (creating.value) {
        if (!/^[A-Za-z0-9_-]{3,32}$/.test(name)) {
          error.value = "Use 3 to 32 letters, numbers, underscores, or hyphens for your username.";
          return;
        }
        const length = [...secret].length;
        if (length < 8 || length > 128) {
          error.value = "Use a password with 8 to 128 characters.";
          return;
        }
      }

      busy.value = true;
      try {
        if (creating.value) {
          const result = await api.auth.register({ username: name, password: secret });
          if ("error" in result) {
            const messages: Record<string, string> = {
              CONFLICT: "That username is taken. Choose another or sign in.",
              INVALID_REQUEST: "Check your username and password and try again.",
              NETWORK_ERROR: "Could not reach Sound It Out. Check your connection and try again.",
            };
            error.value = messages[result.error] ?? "Could not create your account. Try again.";
            return;
          }
          creating.value = false;
          notice.value = "Account created.";
        }
        const failure = await props.signIn(name, secret);
        if (failure) {
          error.value = failure === "UNAUTHORIZED"
            ? "The username or password is incorrect. Check both and try again."
            : "Could not sign in. Try again.";
        } else {
          password.value = "";
        }
      } catch {
        error.value = "Could not reach Sound It Out. Check your connection and try again.";
      } finally {
        busy.value = false;
      }
    }

    return { creating, username, password, busy, error, notice, heading, title, toggleMode, submit };
  },
  template: `
    <section class="account-panel" aria-labelledby="account-heading">
      <h2 id="account-heading" ref="heading" tabindex="-1">{{ title }}</h2>
      <form @submit.prevent="submit" :aria-busy="busy">
        <div class="field">
          <label for="username">Username</label>
          <input id="username" name="username" v-model="username" required
            autocomplete="username" autocapitalize="none" spellcheck="false"
            :aria-describedby="creating ? 'username-hint' : undefined" :readonly="busy">
          <p v-if="creating" id="username-hint" class="hint">3–32 letters, numbers, underscores, or hyphens</p>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" v-model="password" required
            :autocomplete="creating ? 'new-password' : 'current-password'"
            :aria-describedby="creating ? 'password-hint' : undefined" :readonly="busy">
          <p v-if="creating" id="password-hint" class="hint">8–128 characters</p>
        </div>
        <p v-if="notice" role="status">{{ notice }}</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button class="primary" :disabled="busy">
          {{ busy ? (creating ? 'Creating account…' : 'Signing in…') : title }}
        </button>
      </form>
      <button class="text-button" type="button" @click="toggleMode" :disabled="busy">
        {{ creating ? 'Already have an account? Sign in' : 'Create an account' }}
      </button>
    </section>
  `,
});
