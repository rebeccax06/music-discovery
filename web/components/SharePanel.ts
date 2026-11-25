import { computed, defineComponent, onMounted, ref, watch, type PropType } from "vue/dist/vue.esm-bundler.js";
import { findTrack } from "../../shared/catalog.ts";
import { audienceOf, audiences } from "../audience.ts";
import { address, wordKey } from "../route.ts";
import type { Audience, Example, PublicWord, Word } from "../types.ts";
import type { Wall } from "../wall.ts";
import SharedWord from "./SharedWord.ts";

/**
 * Everything about who can see a word, in one place. Two stored facts decide what someone else
 * sees: who may open the word, and which songs are shared. The panel sets both and then shows the
 * view the server actually returns to friends and to everyone else, so the owner never has to work
 * out the combination.
 */
export default defineComponent({
  components: { SharedWord },
  props: {
    word: { type: Object as PropType<Word>, required: true },
    username: { type: String, required: true },
    wall: { type: Object as PropType<Wall>, required: true },
    sessionExpired: Boolean,
  },
  emits: ["close"],
  setup(props, { emit }) {
    const dialog = ref<HTMLDialogElement | null>(null);
    const pending = ref("");
    const error = ref("");
    const feedback = ref("");
    const asking = ref<Exclude<Audience, "PRIVATE"> | null>(null);
    // The option shown as selected: the saved audience, or the one being confirmed. Cancelling or a
    // failed save puts it back, so the panel never shows an audience the word does not have.
    const choice = ref<Audience>(props.word.visibility);
    watch(() => props.word.visibility, saved => { choice.value = saved; });
    const views = ref<{ friends: PublicWord | null; anyone: PublicWord | null } | null>(null);
    const previewError = ref("");
    const linkField = ref<HTMLInputElement | null>(null);
    const sharedCount = computed(() => props.word.examples.filter(example => example.visibility === "SHARED").length);
    const link = computed(() => address({ wall: props.username, word: wordKey(props.word.label) }).toString());

    function syncDialog() {
      // Yield focus to the existing sign-in form, then reopen at the same settings.
      if (props.sessionExpired) {
        dialog.value?.close();
        return;
      }
      if (error.value) {
        error.value = "";
        feedback.value = "You’re signed in again. Check your settings and retry the change.";
      }
      dialog.value?.showModal();
    }
    onMounted(syncDialog);
    watch(() => props.sessionExpired, syncDialog, { flush: "post" });

    function close() {
      if (pending.value) return;
      dialog.value?.close();
      emit("close");
    }

    function title(example: Example) {
      const entry = findTrack(example.item);
      return entry ? `${entry.title} by ${entry.artist}` : "A track that is no longer available";
    }

    async function refreshPreview() {
      previewError.value = "";
      if (props.word.visibility === "PRIVATE") {
        views.value = null;
        return;
      }
      const result = await props.wall.preview(props.word.association);
      if (typeof result === "string") previewError.value = result;
      else if (result) views.value = result;
    }
    watch(() => props.word, refreshPreview, { immediate: true, deep: true });

    async function run(key: string, action: () => Promise<string | undefined>, done: string) {
      if (pending.value) return;
      pending.value = key;
      error.value = "";
      feedback.value = "";
      const failure = await action();
      pending.value = "";
      choice.value = props.word.visibility;
      if (failure) error.value = failure;
      else feedback.value = done;
    }

    async function toggleSong(example: Example, event: Event) {
      const checkbox = event.currentTarget as HTMLInputElement;
      const next = example.visibility === "SHARED" ? "PRIVATE" : "SHARED";
      const open = props.word.visibility !== "PRIVATE";
      await run(
        example.annotation,
        () => props.wall.setExampleVisibility(example.annotation, next),
        next === "SHARED" ? (open ? "This song is now shown with the word" : "Marked to show when you share the word") : "This song is hidden again",
      );
      // The browser toggles the checkbox before the request. Use the saved value even when it did not change.
      const saved = props.word.examples.find(song => song.annotation === example.annotation);
      checkbox.checked = saved?.visibility === "SHARED";
    }

    function choose(audience: Audience) {
      choice.value = audience;
      asking.value = null;
      feedback.value = "";
      if (audience === props.word.visibility) return;
      if (audience !== "PRIVATE" && props.word.examples.length && sharedCount.value === 0) {
        asking.value = audience;
        return;
      }
      void open(audience);
    }

    function open(audience: Audience) {
      asking.value = null;
      return run("audience", () => props.wall.setWordVisibility(props.word.association, audience), `${props.word.label}: ${audienceOf(audience).label.toLowerCase()}`);
    }

    function shareAllAndOpen() {
      const audience = asking.value;
      if (!audience) return;
      asking.value = null;
      return run("audience", () => props.wall.shareAllAndOpen(props.word, audience), `${props.word.label} and its songs: ${audienceOf(audience).label.toLowerCase()}`);
    }

    async function copyLink() {
      try {
        await navigator.clipboard.writeText(link.value);
        feedback.value = "Link copied";
      } catch {
        linkField.value?.select();
        feedback.value = "Select the link and copy it";
      }
    }

    return {
      dialog, audiences, pending, error, feedback, asking, choice, views, previewError, linkField, link,
      title, toggleSong, choose, open, shareAllAndOpen, copyLink, close,
    };
  },
  template: `
    <dialog ref="dialog" class="share-dialog" aria-labelledby="share-heading" @cancel.prevent="close">
      <header class="share-header">
        <div class="section-head">
          <h2 id="share-heading" class="section-heading">Share {{ word.label }}</h2>
          <button class="action" type="button" :disabled="!!pending" autofocus @click="close">Done</button>
        </div>
        <p class="meta share-feedback" role="status">{{ pending ? 'Saving…' : feedback }}</p>
      </header>
      <div class="share">
        <fieldset class="audiences" :disabled="!!pending">
          <legend>Who can open {{ word.label }}</legend>
          <label v-for="audience in audiences" :key="audience.value" class="audience-choice" :class="{ 'is-current': choice === audience.value }">
            <input type="radio" name="audience" :value="audience.value" :checked="choice === audience.value" @change="choose(audience.value)">
            <span>
              <span class="audience-label">{{ audience.label }}</span>
              <span class="field-hint">{{ audience.explain }}</span>
            </span>
          </label>
        </fieldset>

        <div v-if="asking" class="confirm is-start" role="group" aria-labelledby="share-ask">
          <p id="share-ask">No songs are shown with {{ word.label }} yet, so {{ asking === 'LIMITED' ? 'friends' : 'visitors' }} would see only the word.</p>
          <div class="form-actions">
            <button class="primary" type="button" :disabled="!!pending" @click="shareAllAndOpen">
              Show {{ word.examples.length === 1 ? 'the song' : 'all ' + word.examples.length + ' songs' }} too
            </button>
            <button class="action" type="button" :disabled="!!pending" @click="open(asking)">Share only the word</button>
            <button class="action" type="button" :disabled="!!pending" @click="asking = null; choice = word.visibility">Cancel</button>
          </div>
        </div>
        <fieldset v-if="word.examples.length" class="share-songs" :disabled="!!pending">
          <legend>Songs shown with the word</legend>
          <p class="field-hint">Your note and the qualities you picked are shown with a song.<template v-if="word.visibility === 'PRIVATE'"> Nobody sees them until you share the word.</template></p>
          <label v-for="example in word.examples" :key="example.annotation" class="check">
            <input type="checkbox" :checked="example.visibility === 'SHARED'" @change="toggleSong(example, $event)">
            <span>{{ title(example) }}</span>
          </label>
        </fieldset>
        <p v-else class="meta">Add a song first, so there is something to hear.</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <template v-if="word.visibility !== 'PRIVATE'">
          <div class="field share-link">
            <label for="share-link">Link to this word</label>
            <div class="link-row">
              <input id="share-link" ref="linkField" :value="link" readonly @focus="$event.target.select()">
              <button class="action" type="button" @click="copyLink">Copy link</button>
            </div>
            <p class="field-hint">
              <template v-if="word.visibility === 'LIMITED'">Only friends who are signed in can open it. Anyone else sees that there is no public word by this name.</template>
              <template v-else>Anyone with the link can open it.</template>
              Renaming the word changes its link.
            </p>
          </div>
          <div class="visitor-view">
            <h3 class="section-label">What {{ word.visibility === 'LIMITED' ? 'your friends see' : 'others see' }}</h3>
            <p v-if="previewError" class="error" role="alert">{{ previewError }}</p>
            <template v-else-if="views">
              <div v-if="views.friends" class="preview">
                <p class="preview-title">{{ username }}’s {{ views.friends.label }}</p>
                <SharedWord :word="views.friends" :owner="username" />
              </div>
              <p class="meta preview-others">
                <template v-if="views.anyone">People who aren’t your friends see the same.</template>
                <template v-else>People who aren’t your friends can’t open it.</template>
              </p>
            </template>
          </div>
        </template>
      </div>
    </dialog>
  `,
});
