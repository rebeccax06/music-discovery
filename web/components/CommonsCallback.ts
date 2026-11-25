import { defineComponent, nextTick, onMounted, ref } from "vue/dist/vue.esm-bundler.js";
import { api } from "../api.ts";
import { commonsReturnAddress, leaveCommonsCallback } from "../commons.ts";

export default defineComponent({
  setup() {
    const returnTo = commonsReturnAddress();
    const heading = ref<HTMLHeadingElement | null>(null);
    const nameField = ref<HTMLInputElement | null>(null);
    const choosing = ref(false);
    const username = ref("");
    const busy = ref(true);
    const error = ref("");
    const restartMessage = "Commons sign-in could not be completed. Go back and try again.";

    async function accept(result: Awaited<ReturnType<typeof api.auth.commons.finish>>) {
      if (!("error" in result)) {
        leaveCommonsCallback(returnTo);
        return;
      }
      if (result.error === "CONFLICT" || result.error === "INVALID_REQUEST") {
        choosing.value = true;
        error.value = result.error === "CONFLICT"
          ? "That username is already taken on Sound It Out. Choose another."
          : "Choose a username for Sound It Out.";
        await nextTick();
        nameField.value?.focus();
      } else {
        choosing.value = false;
        error.value = restartMessage;
      }
    }

    onMounted(async () => {
      const params = new URLSearchParams(location.search);
      history.replaceState(null, "", location.pathname);
      heading.value?.focus();
      const state = params.get("state");
      const code = params.get("code");
      try {
        if (params.get("error") === "access_denied") error.value = "You cancelled Commons sign-in.";
        else if (!state || !code) error.value = restartMessage;
        else await accept(await api.auth.commons.finish({ state, code }));
      } catch {
        error.value = restartMessage;
      } finally {
        busy.value = false;
      }
    });

    async function choose() {
      if (busy.value) return;
      const name = username.value.trim();
      if (!/^[A-Za-z0-9_-]{3,32}$/.test(name)) {
        error.value = "Use 3 to 32 letters, numbers, underscores, or hyphens.";
        nameField.value?.focus();
        return;
      }
      busy.value = true;
      error.value = "";
      try {
        await accept(await api.auth.commons.choose({ username: name }));
      } catch {
        error.value = "Could not save your username. Try again.";
      } finally {
        busy.value = false;
      }
    }

    return { returnTo, heading, nameField, choosing, username, busy, error, choose, leaveCommonsCallback };
  },
  template: `
    <header class="site-header">
      <div class="header-inner">
        <a class="wordmark" :href="returnTo" @click.prevent="leaveCommonsCallback(returnTo)">Sound It Out</a>
      </div>
    </header>
    <main>
      <section class="account-panel" aria-labelledby="commons-heading">
        <h1 ref="heading" id="commons-heading" tabindex="-1">{{ choosing ? 'Choose a username' : 'Commons sign-in' }}</h1>
        <p v-if="busy" class="meta" role="status">Signing in…</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <form v-if="choosing" @submit.prevent="choose">
          <div class="field">
            <label for="commons-username">Username</label>
            <input id="commons-username" ref="nameField" v-model="username" name="username" autocomplete="username"
              autocapitalize="none" spellcheck="false" maxlength="32" required :readonly="busy" aria-describedby="commons-username-hint">
            <p id="commons-username-hint" class="field-hint">3–32 letters, numbers, underscores, or hyphens</p>
          </div>
          <button type="submit" class="primary" :disabled="busy">Continue</button>
        </form>
        <a v-if="!busy" class="text-button" :href="returnTo" @click.prevent="leaveCommonsCallback(returnTo)">Back to Sound It Out</a>
      </section>
    </main>
  `,
});
