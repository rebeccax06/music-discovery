import { computed, defineComponent, nextTick, ref, watch, type PropType } from "vue/dist/vue.esm-bundler.js";
import type { AccountActions } from "../account.ts";
import type { Friends } from "../friends.ts";
import type { Visited } from "../publicWall.ts";
import { go, route, wordKey } from "../route.ts";
import type { Suggestions } from "../suggestions.ts";
import { notify } from "../toast.ts";
import type { Account, PublicWord, SentSuggestion } from "../types.ts";
import AccountAccess from "./AccountAccess.ts";
import FriendButton from "./FriendButton.ts";
import SharedWord from "./SharedWord.ts";
import SongPicker from "./SongPicker.ts";
import TrackPlayer from "./TrackPlayer.ts";
import WordDisc from "./WordDisc.ts";
import WordShelf from "./WordShelf.ts";

/** One public word as a visitor meets it: read it, hear it, and suggest a song for it. */
const PublicWordPage = defineComponent({
  components: { AccountAccess, SharedWord, SongPicker, TrackPlayer, WordDisc },
  props: {
    word: { type: Object as PropType<PublicWord>, required: true },
    owner: { type: String, required: true },
    account: { type: Object as PropType<Account | null>, default: null },
    session: { type: Object as PropType<Pick<AccountActions, "register" | "signIn">>, required: true },
    suggestions: { type: Object as PropType<Suggestions>, required: true },
  },
  emits: ["close"],
  setup(props) {
    const heading = ref<HTMLElement | null>(null);
    const root = ref<HTMLElement | null>(null);
    const suggesting = ref(false);
    const withdrawing = ref("");
    const error = ref("");
    const sent = computed(() => props.suggestions.sent.value.filter(suggestion => suggestion.word === props.word.association));
    const taken = computed(() => ({
      ...Object.fromEntries(props.word.examples.map(example => [example.item, "Already on this word"])),
      ...Object.fromEntries(sent.value.map(suggestion => [suggestion.item, "You suggested this"])),
    }));

    // Signing in partway through keeps the person on this word, with the picker they asked for open.
    watch(() => props.account, account => {
      if (account) void props.suggestions.loadSent();
    }, { immediate: true });

    async function reveal(open: () => void, focus: string) {
      open();
      await nextTick();
      const target = root.value?.querySelector<HTMLElement>(focus);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    async function send(track: string, _qualities: string[], note: string) {
      const failure = await props.suggestions.send(props.word.association, track, note);
      if (!failure) notify(`Sent to ${props.owner} · it’s a suggestion until ${props.owner} adds it`);
      return failure;
    }

    async function withdraw(suggestion: SentSuggestion) {
      if (withdrawing.value) return;
      withdrawing.value = suggestion.pitch;
      error.value = "";
      const failure = await props.suggestions.withdraw(suggestion.pitch);
      withdrawing.value = "";
      if (failure) error.value = failure;
      else notify("Suggestion withdrawn");
    }

    return { heading, root, suggesting, withdrawing, error, sent, taken, reveal, send, withdraw };
  },
  mounted() {
    (this.$refs.heading as HTMLElement | undefined)?.focus({ preventScroll: true });
  },
  template: `
    <div ref="root" class="word-page">
      <button class="back-link" type="button" @click="$emit('close')">← {{ owner }}’s words</button>
      <article class="stage" :class="{ 'needs-example': !word.examples.length }">
        <h1 ref="heading" class="visually-hidden" tabindex="-1">{{ owner }}’s {{ word.label }}</h1>
        <WordDisc :label="word.label" />
        <p class="meta word-state">What {{ word.label }} means to {{ owner }}<template v-if="word.visibility === 'LIMITED'"> · shared with friends</template></p>
        <SharedWord :word="word" :owner="owner" />

        <section class="record-section" aria-labelledby="suggest-heading">
          <div class="section-head">
            <h2 id="suggest-heading" class="section-heading">Know a song that fits?</h2>
            <button v-if="!suggesting" class="primary suggest" type="button"
              @click="reveal(() => suggesting = true, '.picker .search, .picker .choose, .account-panel input')">Suggest a song</button>
          </div>
          <p class="meta">{{ owner }} reviews suggestions privately and decides whether a song joins their examples.</p>

          <template v-if="suggesting && !account">
            <p class="notice">Sign in to suggest a song for {{ word.label }}. You’ll come straight back here.</p>
            <AccountAccess :register="session.register" :sign-in="session.signIn" />
            <button class="text-button" type="button" @click="suggesting = false">Not now</button>
          </template>
          <SongPicker v-else-if="suggesting" :heading="'Suggest a song for ' + owner + '’s ' + word.label"
            commit="Send suggestion" committing="Sending…" note-label="Why this song?" :with-qualities="false"
            :taken="taken" :submit="send" @close="reveal(() => suggesting = false, '.suggest')" />

          <template v-if="account && (sent.length || suggestions.sentError.value)">
            <h3 class="section-label sent-heading">Your suggestions</h3>
            <p v-if="suggestions.sentError.value" class="error" role="alert">{{ suggestions.sentError.value }}</p>
            <p v-if="error" class="error" role="alert">{{ error }}</p>
            <ul class="examples">
              <li v-for="suggestion in sent" :key="suggestion.pitch" class="suggestion">
                <TrackPlayer :track="suggestion.item">
                  <span class="audience">{{ suggestion.reviewed ? 'Reviewed' : 'Waiting for ' + owner }}</span>
                </TrackPlayer>
                <p v-if="suggestion.note" class="note">“{{ suggestion.note }}”</p>
                <p v-if="suggestion.reviewed" class="meta">{{ owner }}’s review is private. If the song joins their shared songs, you’ll see it above.</p>
                <div v-else class="card-actions">
                  <button class="text-button" type="button" :disabled="!!withdrawing" @click="withdraw(suggestion)">
                    {{ withdrawing === suggestion.pitch ? 'Withdrawing…' : 'Withdraw' }}<span class="visually-hidden"> this suggestion</span>
                  </button>
                </div>
              </li>
            </ul>
          </template>
        </section>
      </article>
    </div>
  `,
});

/** Someone else's wall: the words they let this visitor open, or one of those words. */
export default defineComponent({
  components: { AccountAccess, FriendButton, PublicWordPage, WordShelf },
  props: {
    visited: { type: Object as PropType<Visited>, required: true },
    account: { type: Object as PropType<Account | null>, default: null },
    session: { type: Object as PropType<Pick<AccountActions, "register" | "signIn">>, required: true },
    suggestions: { type: Object as PropType<Suggestions>, required: true },
    friends: { type: Object as PropType<Friends>, required: true },
  },
  setup(props) {
    const joining = ref(false);
    const heading = ref<HTMLElement | null>(null);
    const wall = computed(() => props.visited.wall.value);
    const words = computed(() => wall.value?.wall.words ?? []);
    const selected = computed(() => words.value.find(word => wordKey(word.label) === route.word) ?? null);
    const unknownWord = computed(() => route.word && wall.value && !selected.value ? route.word : "");

    watch(selected, async (now, before) => {
      if (now || !before) return;
      await nextTick();
      const sleeve = document.querySelector<HTMLElement>(`.sleeve[data-association="${CSS.escape(before.association)}"]`);
      (sleeve ?? heading.value)?.focus();
    });

    // Opening or closing a word picks up what the owner has shared since the wall was loaded.
    watch(() => route.word, () => { if (route.wall && wall.value) void props.visited.load(route.wall, { quiet: true }); });

    const open = (word: PublicWord) => go({ wall: route.wall, word: wordKey(word.label) });
    const close = () => go({ wall: route.wall });
    const retry = () => { if (route.wall) void props.visited.load(route.wall); };
    return { joining, heading, wall, words, selected, unknownWord, open, close, retry, go };
  },
  template: `
    <section class="public-wall">
      <p v-if="visited.loading.value" role="status">Loading this Sound Wall…</p>
      <div v-else-if="!wall" class="account-panel">
        <p class="error" role="alert">{{ visited.error.value }}</p>
        <div class="form-actions">
          <button v-if="!visited.missing.value" class="primary" type="button" @click="retry">Try again</button>
          <button v-if="account" class="action" type="button" @click="go({})">Your Sound Wall</button>
        </div>
      </div>

      <PublicWordPage v-else-if="selected" :key="selected.association" :word="selected" :owner="wall.owner"
        :account="account" :session="session" :suggestions="suggestions" @close="close" />

      <template v-else>
        <h1 ref="heading" tabindex="-1">{{ wall.owner }}’s Sound Wall</h1>
        <p class="lead">The words {{ wall.owner }} uses for music, and the songs that show what each one means to them.</p>
        <FriendButton v-if="account" :me="account.username" :username="wall.owner" :friends="friends" />
        <p v-if="unknownWord" class="notice" role="status">
          You can’t open a word called “{{ unknownWord }}” on {{ wall.owner }}’s wall.
          <template v-if="!account">If {{ wall.owner }} shared it with friends, sign in to see it.</template>
          <template v-else-if="friends.standing(account.username, wall.owner) !== 'friend'">If {{ wall.owner }} shared it with friends, it appears once you are friends.</template>
          <template v-else>{{ wall.owner }} may have renamed it, removed it, or made it private.</template>
        </p>
        <p v-if="!words.length" class="meta">{{ wall.owner }} hasn’t shared any words with you yet.</p>
        <WordShelf v-else :words="words" @open="open" />
        <section v-if="!account" class="visitor-invite" aria-label="Sign in">
          <p class="meta">Sign in to add {{ wall.owner }} as a friend, see words shared with friends, and suggest songs.</p>
          <button v-if="!joining" class="primary" type="button" @click="joining = true">Sign in or create an account</button>
          <AccountAccess v-else :register="session.register" :sign-in="session.signIn" />
        </section>
      </template>
    </section>
  `,
});
