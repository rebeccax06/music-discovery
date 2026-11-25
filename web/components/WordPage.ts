import { computed, defineComponent, nextTick, onMounted, ref, type PropType } from "vue/dist/vue.esm-bundler.js";
import { MAX_WORD } from "../../shared/limits.ts";
import { listeningNotePrompt } from "../listeningNotePrompt.ts";
import { notify } from "../toast.ts";
import type { Example, Word } from "../types.ts";
import type { Wall } from "../wall.ts";
import { warnBeforeLeaving } from "../unsaved.ts";
import DescriptionBlock from "./DescriptionBlock.ts";
import ExampleCard from "./ExampleCard.ts";
import SharePanel from "./SharePanel.ts";
import SongPicker from "./SongPicker.ts";
import SuggestionQueue from "./SuggestionQueue.ts";
import WordDisc from "./WordDisc.ts";
import WordPageHelp from "./WordPageHelp.ts";

/**
 * The owner's page for one word: what it means, who can see it, the songs that show it,
 * and what friends suggested.
 */
export default defineComponent({
  components: { DescriptionBlock, ExampleCard, SharePanel, SongPicker, SuggestionQueue, WordDisc, WordPageHelp },
  props: {
    word: { type: Object as PropType<Word>, required: true },
    username: { type: String, required: true },
    wall: { type: Object as PropType<Wall>, required: true },
    sessionExpired: Boolean,
  },
  emits: ["close", "renamed", "removed"],
  setup(props, { emit }) {
    const heading = ref<HTMLElement | null>(null);
    const root = ref<HTMLElement | null>(null);
    const adding = ref(props.word.examples.length === 0);
    const sharing = ref(false);
    const shareButton = ref<HTMLButtonElement | null>(null);
    const mode = ref<"reading" | "renaming" | "removing">("reading");
    const name = ref("");
    const pending = ref(false);
    const error = ref("");
    const taken = computed(() => Object.fromEntries(props.word.examples.map(example => [example.item, "Added"])));
    const shared = computed(() => props.word.examples.filter(example => example.visibility === "SHARED").length);
    warnBeforeLeaving(computed(() => mode.value === "renaming" && name.value.trim() !== props.word.label));

    onMounted(() => heading.value?.focus({ preventScroll: true }));

    async function reveal(open: () => void, focus: string) {
      open();
      await nextTick();
      const target = root.value?.querySelector<HTMLElement>(focus);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    async function addSong(track: string, qualities: string[], note: string) {
      const failure = await props.wall.addExample(props.word.association, track, qualities, note);
      if (!failure) notify("Song added · only you can see it");
      return failure;
    }

    const saveSong = (example: Example, qualities: string[], note: string) => props.wall.saveExample(example, qualities, note);

    async function removeSong(annotation: string) {
      const failure = await props.wall.removeExample(annotation);
      if (!failure) notify("Song removed");
      return failure;
    }

    const describe = (description: string) => props.wall.saveWord(props.word.association, props.word.label, description);

    function closeSharing() {
      sharing.value = false;
      shareButton.value?.focus({ preventScroll: true });
    }

    async function show(next: typeof mode.value, focus: string) {
      error.value = "";
      name.value = props.word.label;
      await reveal(() => { mode.value = next; }, focus);
    }

    async function rename() {
      if (pending.value) return;
      const wanted = name.value.trim().replace(/\s+/g, " ");
      error.value = "";
      if (!wanted) {
        error.value = "A word needs a name.";
        return;
      }
      if (wanted === props.word.label) return show("reading", ".rename-word");
      pending.value = true;
      const failure = await props.wall.saveWord(props.word.association, wanted, props.word.description);
      pending.value = false;
      if (failure) error.value = failure;
      else {
        notify(`Renamed to ${wanted}`);
        mode.value = "reading";
        emit("renamed", wanted);
      }
    }

    async function remove() {
      if (pending.value) return;
      pending.value = true;
      error.value = "";
      const label = props.word.label;
      const failure = await props.wall.removeWord(props.word.association);
      pending.value = false;
      if (failure) error.value = failure;
      else {
        notify(`Removed ${label}`);
        emit("removed");
      }
    }

    return {
      heading, root, adding, sharing, shareButton, mode, name, pending, error, taken, shared,
      reveal, addSong, saveSong, removeSong, describe, closeSharing, show, rename, remove, listeningNotePrompt, MAX_WORD,
    };
  },
  template: `
    <div ref="root" class="word-page">
      <div class="word-page-toolbar">
        <button class="back-link" type="button" @click="$emit('close')">← All words</button>
        <WordPageHelp />
      </div>
      <article class="stage" :class="{ 'needs-example': !word.examples.length }">
        <h1 ref="heading" class="visually-hidden" tabindex="-1">{{ word.label }}</h1>
        <WordDisc :label="word.label" />
        <div class="word-sharing">
          <p class="meta word-state">
            <template v-if="word.visibility === 'PRIVATE'">Private</template>
            <template v-else>{{ word.visibility === 'PUBLIC' ? 'Public' : 'Shared with friends' }} · {{ shared }} of {{ word.examples.length }} {{ word.examples.length === 1 ? 'song' : 'songs' }} shown</template>
          </p>
          <button ref="shareButton" class="action share-toggle" type="button" aria-haspopup="dialog" :disabled="sessionExpired"
            @click="sharing = true">Share…</button>
        </div>
        <SharePanel v-if="sharing" :word="word" :username="username" :wall="wall" :session-expired="sessionExpired" @close="closeSharing" />
        <DescriptionBlock :word="word" :save="describe" />

        <section class="record-section" aria-labelledby="examples-heading">
          <div class="section-head">
            <h2 id="examples-heading" class="section-heading">Songs</h2>
            <button v-if="!adding" class="primary add-song" type="button" @click="reveal(() => adding = true, '.picker .search, .picker .choose')">Add a song</button>
          </div>
          <ul v-if="word.examples.length" class="examples">
            <ExampleCard v-for="example in word.examples" :key="example.annotation" :example="example" :word="word.label"
              :save="saveSong" :remove="removeSong" />
          </ul>
          <SongPicker v-if="adding" :heading="'Add a song to ' + word.label" :commit="'Add to ' + word.label" committing="Adding…"
            :note-label="listeningNotePrompt(word.label)" :taken="taken" :submit="addSong" @close="reveal(() => adding = false, '.add-song')" />
        </section>

        <SuggestionQueue v-if="word.suggestions.length" :word="word" :wall="wall" />

        <section class="record-section manage" aria-label="Word settings">
          <form v-if="mode === 'renaming'" class="rename" @submit.prevent="rename" :aria-busy="pending">
            <div class="field">
              <label for="rename-word">Rename this word</label>
              <input id="rename-word" v-model="name" :maxlength="MAX_WORD" autocomplete="off" :readonly="pending">
              <p v-if="word.visibility === 'PUBLIC'" class="field-hint">Renaming changes the word’s link. The old link will stop working.</p>
            </div>
            <p v-if="error" class="error" role="alert">{{ error }}</p>
            <div class="form-actions">
              <button class="primary" :disabled="pending">{{ pending ? 'Saving…' : 'Save name' }}</button>
              <button class="action" type="button" :disabled="pending" @click="show('reading', '.rename-word')">Cancel</button>
            </div>
          </form>
          <div v-else-if="mode === 'removing'" class="confirm is-start" role="group" aria-labelledby="remove-word">
            <p id="remove-word">Remove {{ word.label }}, its {{ word.examples.length }} {{ word.examples.length === 1 ? 'song' : 'songs' }}, and the suggestions made for it? This cannot be undone.</p>
            <div class="form-actions">
              <button class="primary danger" type="button" :disabled="pending" @click="remove">{{ pending ? 'Removing…' : 'Remove word' }}</button>
              <button class="action keep-word" type="button" :disabled="pending" @click="show('reading', '.remove-word')">Keep</button>
            </div>
            <p v-if="error" class="error" role="alert">{{ error }}</p>
          </div>
          <div v-else class="form-actions manage-actions">
            <button class="action rename-word" type="button" @click="show('renaming', '#rename-word')">Rename</button>
            <button class="text-button danger-text remove-word" type="button" @click="show('removing', '.keep-word')">Remove word</button>
          </div>
        </section>
      </article>
    </div>
  `,
});
