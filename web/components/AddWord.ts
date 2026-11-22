import { computed, defineComponent, ref, type PropType } from "vue/dist/vue.esm-bundler.js";
import { MAX_WORD } from "../../shared/limits.ts";
import { suggestedWords } from "../suggestedWords.ts";
import type { Failure, Word } from "../types.ts";
import { warnBeforeLeaving } from "../unsaved.ts";
import WordDisc from "./WordDisc.ts";

/** Starting a word: one tap on a suggestion, or a word of the person's own. Nothing else is asked. */
export default defineComponent({
  components: { WordDisc },
  props: {
    words: { type: Array as PropType<Word[]>, required: true },
    create: { type: Function as PropType<(label: string) => Promise<Failure>>, required: true },
  },
  emits: ["open", "cancel"],
  setup(props) {
    const label = ref("");
    const pending = ref("");
    const error = ref("");
    // The server decides what counts as the same word; this only saves a round trip for the obvious case.
    const existing = (text: string) => {
      const wanted = text.trim().replace(/\s+/g, " ").toLowerCase();
      return wanted ? props.words.find(word => word.label.toLowerCase() === wanted) ?? null : null;
    };
    const duplicate = computed(() => existing(label.value));
    const offered = computed(() => suggestedWords.filter(word => !existing(word)));
    warnBeforeLeaving(computed(() => !!label.value.trim()));

    async function add(text: string) {
      if (pending.value) return;
      const wanted = text.trim().replace(/\s+/g, " ");
      error.value = "";
      if (!wanted) {
        error.value = "Type a word, or pick one above.";
        return;
      }
      if (wanted.length > MAX_WORD) {
        error.value = `Use a word of ${MAX_WORD} characters or fewer.`;
        return;
      }
      pending.value = wanted;
      const failure = await props.create(wanted);
      pending.value = "";
      if (failure) error.value = failure;
    }

    return { label, pending, error, duplicate, offered, add, MAX_WORD };
  },
  template: `
    <section class="stage needs-example" aria-labelledby="add-heading">
      <h1 id="add-heading" class="visually-hidden" tabindex="-1">Choose a word</h1>
      <WordDisc :label="label.trim() || 'Your word'" :placeholder="!label.trim()" />
      <p class="lead">Choose a word you use for music. Next you’ll add songs that sound like it to you.</p>
      <div v-if="offered.length" class="chips is-centered" role="group" aria-label="Suggested words">
        <button v-for="word in offered" :key="word" class="chip suggested-word" type="button" :disabled="!!pending" @click="add(word)">
          {{ pending === word ? 'Adding…' : word }}
        </button>
      </div>
      <form class="stage-edit" aria-label="Add your own word" @submit.prevent="add(label)" :aria-busy="!!pending">
        <div class="field">
          <label for="new-word">Or your own word</label>
          <input id="new-word" v-model="label" name="label" :maxlength="MAX_WORD" autocomplete="off" autocapitalize="words" :readonly="!!pending">
          <p v-if="duplicate" class="field-hint" role="status">
            You already have <button class="text-button" type="button" @click="$emit('open', duplicate.label)">{{ duplicate.label }}</button>.
          </p>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <div class="form-actions">
          <button class="primary" :disabled="!!pending || !!duplicate">{{ pending && pending === label.trim() ? 'Adding…' : 'Add word' }}</button>
          <button v-if="words.length" class="action" type="button" :disabled="!!pending" @click="$emit('cancel')">Cancel</button>
        </div>
      </form>
    </section>
  `,
});
