import { computed, defineComponent, nextTick, onMounted, ref, type PropType } from "vue/dist/vue.esm-bundler.js";
import type { Friends } from "../friends.ts";
import { go, wordKey } from "../route.ts";
import type { Suggestions } from "../suggestions.ts";
import { notify } from "../toast.ts";
import type { Friend, SentSuggestion } from "../types.ts";
import TrackPlayer from "./TrackPlayer.ts";

/**
 * The social side of the app in one place: who your friends are, the words they have opened to you
 * (the places you can suggest songs), requests waiting on either side, and how your suggestions went.
 */
export default defineComponent({
  components: { TrackPlayer },
  props: {
    me: { type: String, required: true },
    friends: { type: Object as PropType<Friends>, required: true },
    suggestions: { type: Object as PropType<Suggestions>, required: true },
  },
  setup(props) {
    const heading = ref<HTMLElement | null>(null);
    const username = ref("");
    const pending = ref("");
    const error = ref("");
    const removing = ref("");
    const circle = computed(() => props.friends.circle.value);
    const sent = computed(() => props.suggestions.sent.value);

    onMounted(async () => {
      heading.value?.focus({ preventScroll: true });
      await Promise.all([props.friends.load(), props.suggestions.loadSent()]);
    });

    async function run(key: string, action: () => Promise<string | undefined>, done: string) {
      if (pending.value) return false;
      pending.value = key;
      error.value = "";
      const failure = await action();
      pending.value = "";
      if (failure) {
        error.value = failure;
        return false;
      }
      notify(done);
      return true;
    }

    async function ask() {
      const name = username.value.trim();
      if (!name) {
        error.value = "Type a friend’s username.";
        return;
      }
      if (name.toLowerCase() === props.me.toLowerCase()) {
        error.value = "That is your own username.";
        return;
      }
      if (await run("ask", () => props.friends.request(name), `Friend request sent to ${name}`)) username.value = "";
    }

    async function unfriend(friend: Friend) {
      if (await run(friend.username, () => props.friends.remove(friend.username), `You and ${friend.username} are no longer friends`)) {
        removing.value = "";
        await nextTick();
        heading.value?.focus();
      }
    }

    function songs(count: number) {
      return count === 0 ? "No songs shared yet" : count === 1 ? "1 song" : `${count} songs`;
    }

    function wordFor(suggestion: SentSuggestion) {
      const friend = circle.value.friends.find(entry => entry.username === suggestion.to);
      return friend?.wall.words.find(word => word.association === suggestion.word) ?? null;
    }

    const openWord = (owner: string, label: string) => go({ wall: owner, word: wordKey(label) });
    const withdraw = (suggestion: SentSuggestion) =>
      run(suggestion.pitch, () => props.suggestions.withdraw(suggestion.pitch), "Suggestion withdrawn");

    return { heading, username, pending, error, removing, circle, sent, ask, run, unfriend, songs, wordFor, openWord, withdraw, go };
  },
  template: `
    <section class="friends-page">
      <h1 ref="heading" tabindex="-1">Friends</h1>
      <p class="lead">Friends can open the words you share with friends, and you can open theirs. Suggest a song when you hear one that fits.</p>
      <p v-if="friends.loadError.value" class="error" role="alert">{{ friends.loadError.value }}</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <section v-if="circle.received.length" class="record-section requests" aria-labelledby="received-heading">
        <h2 id="received-heading" class="section-heading">Asking to be your friend</h2>
        <ul class="people">
          <li v-for="person in circle.received" :key="person.username" class="person">
            <span class="person-name">{{ person.username }}</span>
            <div class="form-actions">
              <button class="primary" type="button" :disabled="!!pending"
                @click="run(person.username, () => friends.accept(person.username), 'You and ' + person.username + ' are now friends')">
                Accept<span class="visually-hidden"> {{ person.username }}</span>
              </button>
              <button class="action" type="button" :disabled="!!pending"
                @click="run(person.username, () => friends.decline(person.username), 'Request declined')">
                Decline<span class="visually-hidden"> {{ person.username }}</span>
              </button>
            </div>
          </li>
        </ul>
      </section>

      <section class="record-section" aria-labelledby="circle-heading">
        <div class="section-head">
          <h2 id="circle-heading" class="section-heading">Your friends</h2>
        </div>
        <form class="add-friend-form" @submit.prevent="ask" :aria-busy="pending === 'ask'">
          <div class="field">
            <label for="friend-username">Add a friend by username</label>
            <div class="link-row">
              <input id="friend-username" v-model="username" autocomplete="off" autocapitalize="none" spellcheck="false" :readonly="pending === 'ask'">
              <button class="primary" :disabled="!!pending">{{ pending === 'ask' ? 'Sending…' : 'Send request' }}</button>
            </div>
            <p class="field-hint">They’ll see your request here and can accept or decline it.</p>
          </div>
        </form>
        <ul v-if="circle.sent.length" class="people is-quiet" aria-label="Requests you sent">
          <li v-for="person in circle.sent" :key="person.username" class="person">
            <span class="person-name">{{ person.username }}</span>
            <span class="meta">Waiting for them to accept</span>
            <button class="text-button" type="button" :disabled="!!pending"
              @click="run(person.username, () => friends.cancel(person.username), 'Request cancelled')">
              Cancel<span class="visually-hidden"> request to {{ person.username }}</span>
            </button>
          </li>
        </ul>

        <p v-if="friends.loaded.value && !circle.friends.length" class="meta">No friends yet. Ask someone by their username, or open their wall and add them there.</p>
        <ul v-else class="friend-cards">
          <li v-for="friend in circle.friends" :key="friend.username" class="friend-card">
            <div class="friend-head">
              <h3 class="friend-name">{{ friend.username }}</h3>
              <button class="text-button" type="button" @click="go({ wall: friend.username })">Open {{ friend.username }}’s wall</button>
            </div>
            <p v-if="!friend.wall.words.length" class="meta">{{ friend.username }} hasn’t shared any words with friends yet.</p>
            <ul v-else class="friend-words" :aria-label="friend.username + '’s words'">
              <li v-for="word in friend.wall.words" :key="word.association">
                <button class="friend-word" type="button" @click="openWord(friend.username, word.label)">
                  <span class="friend-word-label">{{ word.label }}</span>
                  <span class="meta">{{ songs(word.examples.length) }} · {{ word.visibility === 'LIMITED' ? 'Friends' : 'Public' }}</span>
                </button>
              </li>
            </ul>
            <div v-if="removing === friend.username" class="confirm is-start" role="group" :aria-label="'Remove ' + friend.username + '?'">
              <p>Remove {{ friend.username }} as a friend? You’ll both stop seeing each other’s words for friends. Suggestions already sent are kept.</p>
              <div class="form-actions">
                <button class="primary danger" type="button" :disabled="!!pending" @click="unfriend(friend)">Remove friend</button>
                <button class="action" type="button" :disabled="!!pending" @click="removing = ''">Keep</button>
              </div>
            </div>
            <button v-else class="text-button is-quiet" type="button" @click="removing = friend.username">
              Remove<span class="visually-hidden"> {{ friend.username }} as a friend</span>
            </button>
          </li>
        </ul>
      </section>

      <section class="record-section" aria-labelledby="sent-heading">
        <h2 id="sent-heading" class="section-heading">Songs you suggested</h2>
        <p v-if="suggestions.sentError.value" class="error" role="alert">{{ suggestions.sentError.value }}</p>
        <p v-if="!sent.length" class="meta">When you suggest a song for a friend’s word, you can follow it here. Reviews stay private to the word’s owner.</p>
        <ul v-else class="examples">
          <li v-for="suggestion in sent" :key="suggestion.pitch" class="suggestion">
            <p class="section-label">
              For {{ suggestion.to }}<template v-if="wordFor(suggestion)">’s “{{ wordFor(suggestion).label }}”</template>
            </p>
            <TrackPlayer :track="suggestion.item">
              <span class="audience">{{ suggestion.reviewed ? 'Reviewed' : 'Waiting for ' + suggestion.to }}</span>
            </TrackPlayer>
            <p v-if="suggestion.note" class="note">“{{ suggestion.note }}”</p>
            <div class="card-actions">
              <button v-if="wordFor(suggestion)" class="text-button" type="button" @click="openWord(suggestion.to, wordFor(suggestion).label)">Open the word</button>
              <button v-if="!suggestion.reviewed" class="text-button" type="button" :disabled="!!pending" @click="withdraw(suggestion)">
                Withdraw<span class="visually-hidden"> this suggestion</span>
              </button>
            </div>
          </li>
        </ul>
      </section>
    </section>
  `,
});
