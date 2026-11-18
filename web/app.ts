import { createApp, nextTick, onMounted, ref } from "vue/dist/vue.esm-bundler.js";
import AccountAccess from "./components/AccountAccess.ts";
import { useAccount } from "./account.ts";

createApp({
  components: { AccountAccess },
  setup() {
    const session = useAccount();
    const title = ref<HTMLHeadingElement | null>(null);
    const signingOut = ref(false);
    const signOutError = ref("");

    async function signIn(username: string, password: string) {
      const failure = await session.signIn(username, password);
      if (!failure) await nextTick(() => title.value?.focus());
      return failure;
    }

    async function signOut() {
      if (signingOut.value) return;
      signingOut.value = true;
      signOutError.value = "";
      try {
        const failure = await session.signOut();
        if (failure) signOutError.value = "Could not sign out. Try again.";
        else await nextTick(() => title.value?.focus());
      } catch {
        signOutError.value = "Could not sign out. Check your connection and try again.";
      } finally {
        signingOut.value = false;
      }
    }

    onMounted(session.restore);
    return { ...session, title, signIn, signOut, signingOut, signOutError };
  },
  template: `
    <header class="site-header">
      <div class="header-inner">
        <a class="wordmark" href="/">Sound It Out</a>
        <div v-if="account" class="account-summary">
          <span>{{ account.username }}</span>
          <button class="text-button" type="button" :disabled="signingOut" @click="signOut">
            {{ signingOut ? 'Signing out…' : 'Sign out' }}
          </button>
        </div>
      </div>
    </header>
    <main>
      <h1 ref="title" tabindex="-1">Sound Wall</h1>
      <p v-if="restoring" role="status">Checking your session…</p>
      <div v-else-if="restoreError" class="account-panel">
        <p class="error" role="alert">{{ restoreError }}</p>
        <button class="primary" type="button" @click="restore">Try again</button>
      </div>
      <template v-else-if="account">
        <p role="status">Signed in as {{ account.username }}.</p>
        <p v-if="signOutError" class="error" role="alert">{{ signOutError }}</p>
      </template>
      <template v-else>
        <p>Sign in to build your Sound Wall.</p>
        <AccountAccess :sign-in="signIn" />
      </template>
    </main>
  `,
}).mount("#app");
