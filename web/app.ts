import { computed, createApp, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue/dist/vue.esm-bundler.js";
import { useAccount } from "./account.ts";
import AccountAccess from "./components/AccountAccess.ts";
import FriendsPage from "./components/FriendsPage.ts";
import OwnWall from "./components/OwnWall.ts";
import PublicWallView from "./components/PublicWallView.ts";
import { useFriends } from "./friends.ts";
import { usePublicWall } from "./publicWall.ts";
import { go, route } from "./route.ts";
import { useSuggestions } from "./suggestions.ts";
import { dismiss, toast } from "./toast.ts";
import { useWall } from "./wall.ts";

createApp({
  components: { AccountAccess, FriendsPage, OwnWall, PublicWallView },
  setup() {
    const session = useAccount();
    const { account, restoreError } = session;
    const expired = ref(false);
    // Where the person was when their session ended, so signing in again can return them there. A
    // button disables itself while its request runs and loses focus, so remember the last focus.
    let lastFocused: HTMLElement | null = null;
    const remember = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && !event.target.closest(".session-ended")) lastFocused = event.target;
    };
    document.addEventListener("focusin", remember);
    onBeforeUnmount(() => document.removeEventListener("focusin", remember));
    let interrupted: HTMLElement | null = null;
    const sessionEnded = () => {
      if (expired.value) return;
      interrupted = lastFocused;
      expired.value = true;
      void nextTick(() => {
        const panel = document.querySelector<HTMLElement>(".session-ended");
        panel?.scrollIntoView({ block: "start", behavior: "smooth" });
        panel?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      });
    };
    const wall = useWall(sessionEnded);
    const visited = usePublicWall(() => !!account.value && !expired.value);
    const suggestions = useSuggestions(sessionEnded);
    const friends = useFriends(sessionEnded);
    const ready = ref(false);
    const signingOut = ref(false);
    const signOutError = ref("");
    const accountMenuOpen = ref(false);
    const accountMenu = ref<HTMLElement | null>(null);
    const accountButton = ref<HTMLButtonElement | null>(null);
    function closeAccountMenu(event: MouseEvent) {
      if (!accountMenu.value?.contains(event.target as Node)) accountMenuOpen.value = false;
    }
    function escapeAccountMenu(event: KeyboardEvent) {
      if (event.key === "Escape" && accountMenuOpen.value) {
        accountMenuOpen.value = false;
        accountButton.value?.focus();
      }
    }
    document.addEventListener("click", closeAccountMenu);
    document.addEventListener("keydown", escapeAccountMenu);
    onBeforeUnmount(() => {
      document.removeEventListener("click", closeAccountMenu);
      document.removeEventListener("keydown", escapeAccountMenu);
    });
    const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
    const visiting = computed(() => !!route.wall && !(account.value && sameName(route.wall, account.value.username)));
    const onFriends = computed(() => !!account.value && route.friends && !route.wall);

    /** A person's own wall has one address. Their public address leads back to it. */
    function redirectOwnWall() {
      if (!route.wall || !account.value || !sameName(route.wall, account.value.username)) return false;
      go({ word: route.word }, { replace: true });
      return true;
    }

    watch(() => route.wall, username => {
      if (ready.value && !redirectOwnWall() && username) void visited.load(username);
    });

    /** What other people change (friend requests, suggestions, shared words) is picked up on return. */
    async function refresh() {
      if (!account.value || expired.value) return;
      await Promise.all([
        wall.load({ quiet: true }),
        friends.load(),
        visiting.value && route.wall ? visited.load(route.wall, { quiet: true }) : undefined,
      ]);
    }
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    onBeforeUnmount(() => document.removeEventListener("visibilitychange", onVisible));
    watch(() => route.friends, () => { void refresh(); });

    async function signIn(username: string, password: string) {
      const failure = await session.signIn(username, password);
      if (failure) return failure;
      await signedIn();
    }

    /** Creating an account signs the person in, so it ends the same way signing in does. */
    async function register(username: string, password: string) {
      const outcome = await session.register(username, password);
      if (outcome) return outcome;
      await signedIn();
    }

    async function signedIn() {
      // Signing in again after a session ended must not replace the page: what the person entered
      // is still on it, and the interface promised to keep it.
      const resuming = expired.value;
      expired.value = false;
      redirectOwnWall();
      if (resuming && interrupted?.isConnected) {
        const place = interrupted;
        void nextTick(() => {
          place.scrollIntoView({ block: "center", behavior: "smooth" });
          place.focus({ preventScroll: true });
        });
      }
      interrupted = null;
      await Promise.all([
        wall.load({ quiet: resuming }),
        friends.load(),
        // Signing in partway through a visit keeps the visitor where they were, now seeing what friends see.
        visiting.value && route.wall ? visited.load(route.wall, { quiet: true }) : undefined,
      ]);
    }

    async function signOut() {
      if (signingOut.value) return;
      signingOut.value = true;
      signOutError.value = "";
      const failure = await session.signOut();
      signingOut.value = false;
      if (failure) {
        signOutError.value = failure;
        return;
      }
      accountMenuOpen.value = false;
      expired.value = false;
      wall.clear();
      suggestions.clear();
      friends.clear();
      if (route.wall) await visited.load(route.wall, { quiet: true });
      else go({}, { replace: true });
      await nextTick();
      document.querySelector<HTMLElement>("main h1, main h2")?.focus();
    }

    async function start() {
      ready.value = false;
      await session.restore();
      if (!restoreError.value) {
        const own = redirectOwnWall();
        await Promise.all([
          account.value ? wall.load() : undefined,
          account.value ? friends.load() : undefined,
          !own && route.wall ? visited.load(route.wall) : undefined,
        ]);
      }
      ready.value = true;
    }

    function follow() {
      const next = toast.follow;
      dismiss();
      next?.run();
    }

    onMounted(start);

    return {
      account, restoreError, session: { register, signIn }, wall, visited, suggestions, friends,
      ready, expired, visiting, onFriends, signingOut, signOutError, accountMenuOpen, accountMenu, accountButton,
      start, signOut, toast, follow, go, route,
    };
  },
  template: `
    <header class="site-header">
      <div class="header-inner">
        <a class="wordmark" href="/" @click.prevent="go({})">Sound It Out</a>
        <nav v-if="account" class="main-nav" aria-label="Main">
          <a class="nav-link" href="/" :aria-current="!visiting && !onFriends ? 'page' : undefined" @click.prevent="go({})">Your wall</a>
          <a class="nav-link" href="/?friends" :aria-current="onFriends ? 'page' : undefined" @click.prevent="go({ friends: true })">
            Friends<span v-if="friends.waiting.value" class="badge" :aria-label="friends.waiting.value + ' waiting'">{{ friends.waiting.value }}</span>
          </a>
        </nav>
        <div v-if="account" ref="accountMenu" class="account-menu">
          <button ref="accountButton" class="account-toggle" type="button" aria-controls="account-options"
            :aria-expanded="accountMenuOpen" @click="accountMenuOpen = !accountMenuOpen">
            <span>{{ account.username }}</span><span aria-hidden="true">▾</span>
          </button>
          <div v-if="accountMenuOpen" id="account-options" class="account-options">
            <button class="account-signout" type="button" :disabled="signingOut" @click="signOut">
              {{ signingOut ? 'Signing out…' : 'Sign out' }}
            </button>
          </div>
        </div>
      </div>
    </header>
    <main>
      <p v-if="!ready" role="status">Checking your session…</p>
      <div v-else-if="restoreError" class="account-panel">
        <p class="error" role="alert">{{ restoreError }}</p>
        <button class="primary" type="button" @click="start">Try again</button>
      </div>
      <template v-else>
        <p v-if="signOutError" class="error" role="alert">{{ signOutError }}</p>
        <section v-if="expired && account" class="session-ended" aria-label="Sign in again">
          <p class="notice" role="alert">Your session has ended. Sign in again to continue. What you entered on this page is still here, and you’ll go back to it.</p>
          <AccountAccess :register="session.register" :sign-in="session.signIn" />
        </section>
        <PublicWallView v-if="visiting" :visited="visited" :account="account" :session="session" :suggestions="suggestions" :friends="friends" />
        <FriendsPage v-else-if="onFriends" :me="account.username" :friends="friends" :suggestions="suggestions" />
        <OwnWall v-else-if="account" :username="account.username" :wall="wall" />
        <section v-else class="welcome">
          <h1 tabindex="-1">Show a friend what your music words sound like</h1>
          <p class="lead">Pick a word like “dreamy,” add the songs that sound like it to you, and share it with friends. They can listen and suggest songs that fit.</p>
          <AccountAccess :register="session.register" :sign-in="session.signIn" />
        </section>
      </template>
    </main>
    <div class="toast" :class="{ 'is-shown': toast.message }" role="status">
      <span>{{ toast.message }}</span>
      <button v-if="toast.follow" class="toast-action" type="button" @click="follow">{{ toast.follow.label }}</button>
    </div>
  `,
}).mount("#app");
