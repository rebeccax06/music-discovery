import { computed, defineComponent, nextTick, ref, type PropType } from "vue/dist/vue.esm-bundler.js";
import type { AccountActions } from "../account.ts";
import { continueWithCommons } from "../commons.ts";

let instances = 0;

/** Signing in, or creating an account and signing in with it in one step. */
export default defineComponent({
  props: {
    register: { type: Function as PropType<AccountActions["register"]>, required: true },
    signIn: { type: Function as PropType<AccountActions["signIn"]>, required: true },
    recovering: Boolean,
  },
  setup(props) {
    const id = `account-${instances += 1}`;
    const creating = ref(false);
    const username = ref("");
    const password = ref("");
    const action = ref<"password" | "commons" | null>(null);
    const busy = computed(() => action.value !== null);
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

      action.value = "password";
      try {
        if (creating.value) {
          const refused = await props.register(name, secret);
          if (refused) {
            error.value = refused;
            return;
          }
          // The account exists now. If signing in fails, the form offers sign-in with the same name.
          creating.value = false;
          notice.value = "Account created.";
        }
        const failure = await props.signIn(name, secret);
        if (failure) error.value = failure;
        else password.value = "";
      } finally {
        action.value = null;
      }
    }

    async function useCommons() {
      if (busy.value) return;
      action.value = "commons";
      error.value = "";
      notice.value = "";
      try {
        error.value = await continueWithCommons() ?? "";
      } catch {
        error.value = "Could not reach Sound It Out. Check your connection and try again.";
      } finally {
        action.value = null;
      }
    }

    return { id, creating, username, password, action, busy, error, notice, heading, title, toggleMode, submit, useCommons };
  },
  template: `
    <section class="account-panel" :aria-labelledby="id">
      <h2 :id="id" ref="heading" tabindex="-1">{{ title }}</h2>
      <form @submit.prevent="submit" :aria-busy="busy">
        <div class="field">
          <label :for="id + '-username'">Username</label>
          <input :id="id + '-username'" name="username" v-model="username" required
            autocomplete="username" autocapitalize="none" spellcheck="false"
            :aria-describedby="creating ? id + '-username-hint' : undefined" :readonly="busy">
          <p v-if="creating" :id="id + '-username-hint'" class="field-hint">3–32 letters, numbers, underscores, or hyphens</p>
        </div>
        <div class="field">
          <label :for="id + '-password'">Password</label>
          <input :id="id + '-password'" name="password" type="password" v-model="password" required
            :autocomplete="creating ? 'new-password' : 'current-password'"
            :aria-describedby="creating ? id + '-password-hint' : undefined" :readonly="busy">
          <p v-if="creating" :id="id + '-password-hint'" class="field-hint">8–128 characters</p>
        </div>
        <p v-if="notice" role="status">{{ notice }}</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button class="primary" :disabled="busy">
          {{ action === 'password' ? (creating ? 'Creating account…' : 'Signing in…') : title }}
        </button>
      </form>
      <button class="text-button" type="button" @click="toggleMode" :disabled="busy">
        {{ creating ? 'Already have an account? Sign in' : 'Create an account' }}
      </button>
      <div class="commons-option">
        <p v-if="recovering" class="field-hint">Commons opens a sign-in page. Copy any unsaved work before continuing.</p>
        <button class="action" type="button" @click="useCommons" :disabled="busy">
          {{ action === 'commons' ? 'Connecting…' : 'Continue with Commons' }}
        </button>
      </div>
    </section>
  `,
});
