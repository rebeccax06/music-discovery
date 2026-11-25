import { computed, defineComponent, nextTick, ref, watch, type PropType } from "vue/dist/vue.esm-bundler.js";
import { listeningNotePrompt } from "../listeningNotePrompt.ts";
import { notify } from "../toast.ts";
import type { Fit, Suggestion, Word } from "../types.ts";
import type { Wall } from "../wall.ts";
import { warnBeforeLeaving } from "../unsaved.ts";
import SongPicker from "./SongPicker.ts";
import TrackPlayer from "./TrackPlayer.ts";

const fits: ReadonlyArray<{ fit: Fit; label: string; mark: string }> = [
  { fit: "MATCH", label: "Match", mark: "✓" },
  { fit: "PARTIAL", label: "Partly", mark: "~" },
  { fit: "MISS", label: "Doesn’t match", mark: "✕" },
];

/** One suggested song with the owner's private review of it. Adding a match to examples is its own step. */
const SuggestionCard = defineComponent({
  components: { SongPicker, TrackPlayer },
  props: {
    suggestion: { type: Object as PropType<Suggestion>, required: true },
    word: { type: Object as PropType<Word>, required: true },
    wall: { type: Object as PropType<Wall>, required: true },
  },
  setup(props) {
    const fit = ref<Fit | null>(null);
    const response = ref("");
    const pending = ref(false);
    const error = ref("");
    const adding = ref(false);
    const root = ref<HTMLElement | null>(null);
    const reviewed = computed(() => props.suggestion.fit !== "PENDING");
    const inExamples = computed(() => props.word.examples.some(example => example.item === props.suggestion.item));
    const changed = computed(() => fit.value !== null
      && (fit.value !== props.suggestion.fit || response.value.trim() !== props.suggestion.response));
    warnBeforeLeaving(computed(() => response.value.trim() !== props.suggestion.response));

    watch(() => [props.suggestion.fit, props.suggestion.response] as const, ([savedFit, savedResponse]) => {
      fit.value = savedFit === "PENDING" ? null : savedFit;
      response.value = savedResponse;
    }, { immediate: true });

    async function save() {
      if (pending.value || !fit.value) return;
      pending.value = true;
      error.value = "";
      const failure = await props.wall.review(props.suggestion.pitch, fit.value, response.value.trim());
      pending.value = false;
      if (failure) error.value = failure;
      else notify("Review saved · only you can see it");
    }

    async function promote(_track: string, qualities: string[], note: string) {
      const failure = await props.wall.promote(props.suggestion.pitch, qualities, note);
      if (!failure) notify(`Added to ${props.word.label} · only you can see it`);
      return failure;
    }

    async function closeAdding() {
      adding.value = false;
      await nextTick();
      root.value?.querySelector<HTMLElement>(".add-match, .fit")?.focus();
    }

    return { fits, fit, response, pending, error, adding, root, reviewed, inExamples, changed, save, promote, closeAdding, listeningNotePrompt };
  },
  template: `
    <li ref="root" class="suggestion">
      <p class="section-label">Suggested by {{ suggestion.contributor }}</p>
      <TrackPlayer :track="suggestion.item">
        <span v-if="inExamples" class="audience">In your examples</span>
      </TrackPlayer>
      <p v-if="suggestion.note" class="note">“{{ suggestion.note }}”</p>

      <form class="review" @submit.prevent="save" :aria-busy="pending">
        <div class="fits" role="group" :aria-label="'How well does this fit ' + word.label + '?'">
          <button v-for="option in fits" :key="option.fit" class="fit" type="button"
            :aria-pressed="fit === option.fit ? 'true' : 'false'" :disabled="pending" @click="fit = option.fit">
            <span aria-hidden="true">{{ option.mark }}</span> {{ option.label }}
          </button>
        </div>
        <div v-if="fit" class="field">
          <label :for="'response-' + suggestion.pitch">A note to yourself about why <span class="optional">optional</span></label>
          <textarea :id="'response-' + suggestion.pitch" v-model="response" maxlength="280" rows="2" :readonly="pending"></textarea>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <div class="form-actions">
          <button v-if="changed" class="primary" :disabled="pending">{{ pending ? 'Saving…' : (reviewed ? 'Save changes' : 'Save review') }}</button>
          <button v-if="suggestion.fit === 'MATCH' && !changed && !inExamples && !adding" class="primary add-match" type="button" @click="adding = true">
            Add to examples
          </button>
          <span v-if="reviewed && !changed" class="field-hint">Reviewed. You can change this at any time.</span>
        </div>
      </form>

      <SongPicker v-if="adding" :heading="'Add to ' + word.label" :commit="'Add to ' + word.label" committing="Adding…"
        :note-label="listeningNotePrompt(word.label)" :only="suggestion.item" :submit="promote" @close="closeAdding" />
    </li>
  `,
});

/** The suggestions made for a word, kept apart from its examples. */
export default defineComponent({
  components: { SuggestionCard },
  props: {
    word: { type: Object as PropType<Word>, required: true },
    wall: { type: Object as PropType<Wall>, required: true },
  },
  setup(props) {
    const waiting = computed(() => props.word.suggestions.filter(suggestion => suggestion.fit === "PENDING").length);
    return { waiting };
  },
  template: `
    <section class="record-section suggestions" aria-labelledby="suggestions-heading">
      <h3 id="suggestions-heading" class="section-heading">
        Suggestions <span class="count">{{ waiting ? waiting + ' to review' : 'all reviewed' }}</span>
      </h3>
      <p class="meta">Songs friends think fit {{ word.label }}. They are not part of your examples unless you add them. Only you can see your reviews.</p>
      <ul class="examples">
        <SuggestionCard v-for="suggestion in word.suggestions" :key="suggestion.pitch" :suggestion="suggestion" :word="word" :wall="wall" />
      </ul>
    </section>
  `,
});
