import { createApp, nextTick, onMounted, ref } from "vue/dist/vue.esm-bundler.js";
import AccountAccess from "./components/AccountAccess.ts";
import PublicWall from "./components/PublicWall.ts";
import SoundWall from "./components/SoundWall.ts";
import { useAccount } from "./account.ts";
import { useWall } from "./wall.ts";

createApp({
  components: { AccountAccess, PublicWall, SoundWall },
  setup() {
    const session = useAccount();
    const wall = useWall();
    const title = ref<HTMLHeadingElement | null>(null);
    const ready = ref(false);
    const signingOut = ref(false);
    const signOutError = ref("");
    const showSignIn = ref(false);

    async function signIn(username: string, password: string) {
      const failure = await session.signIn(username, password);
      if (!failure) {
        await wall.open(session.account.value ?? null);
        await nextTick(() => title.value?.focus());
      }
      return failure;
    }

    async function signOut() {
      if (signingOut.value) return;
      signingOut.value = true;
      signOutError.value = "";
      try {
        const failure = await session.signOut();
        if (failure) signOutError.value = "Could not sign out. Try again.";
        else {
          await wall.open(null);
          await nextTick(() => title.value?.focus());
        }
      } catch {
        signOutError.value = "Could not sign out. Check your connection and try again.";
      } finally {
        signingOut.value = false;
      }
    }

    async function start() {
      ready.value = false;
      await session.restore();
      if (!session.restoreError.value) await wall.open(session.account.value ?? null);
      ready.value = true;
    }

    onMounted(start);

    return { ...session, ...wall, title, ready, start, signIn, signOut, signingOut, signOutError, showSignIn };
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
      <h1 ref="title" tabindex="-1">{{ publicWall ? publicWall.owner + ''s Sound Wall' : 'Sound Wall' }}</h1>
      <p v-if="!ready" role="status">Checking your session…</p>
      <div v-else-if="restoreError" class="account-panel">
        <p class="error" role="alert">{{ restoreError }}</p>
        <button class="primary" type="button" @click="start">Try again</button>
      </div>
      <template v-else>
        <p v-if="signOutError" class="error" role="alert">{{ signOutError }}</p>
        <PublicWall v-if="publicWall" :wall="publicWall" :signed-in="!!account" @back="showOwnWall" />
        <p v-else-if="wallUnavailable" class="error" role="alert">This Sound Wall could not be found.</p>
        <button v-if="account && wallUnavailable && !publicWall" class="text-button" type="button" @click="showOwnWall">Your Sound Wall</button>
        <SoundWall v-if="account && !publicWall"
          :username="account.username" :words="words" :loading="loading" :load-error="loadError" :open-id="openId"
          :reload="load" :create-word="createWord" :save-word="saveWord"
          :set-visibility="setVisibility" :remove-word="removeWord" />
        <div v-if="!account && publicWall && !showSignIn" class="visitor-invite">
          <p class="meta">Define the words you use for music.</p>
          <button class="primary" type="button" @click="showSignIn = true">Sign in</button>
        </div>
        <template v-else-if="!account">
          <p class="lead">{{ publicWall ? 'Sign in to build your own Sound Wall.' : 'Sign in to build your Sound Wall.' }}</p>
          <AccountAccess :sign-in="signIn" />
        </template>
      </template>
    </main>
  `,
}).mount("#app");
