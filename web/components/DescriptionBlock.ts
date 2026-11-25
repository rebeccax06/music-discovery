import { computed, defineComponent, nextTick, ref, type PropType } from "vue/dist/vue.esm-bundler.js";
import { draft } from "../../shared/draft.ts";
import { MAX_DESCRIPTION } from "../../shared/limits.ts";
import type { Failure, Word } from "../types.ts";
import { warnBeforeLeaving } from "../unsaved.ts";

/**
 * What a word means to its owner. It shows the owner's own text when there is some. Otherwise it
 * shows a draft computed from the qualities picked for the word's songs. The draft is never saved,
 * so it always matches the songs on screen and can never replace what the owner wrote.
 */
export default defineComponent({
  props: {
    word: { type: Object as PropType<Word>, required: true },
    save: { type: Function as PropType<(description: string) => Promise<Failure>>, required: true },
  },
  setup(props) {
    const mode = ref<"reading" | "writing" | "replacing">("reading");
    const text = ref("");
    const pending = ref(false);
    const error = ref("");
    const root = ref<HTMLElement | null>(null);
    const drafted = computed(() => draft(props.word.label, props.word.examples, { owner: true }));
    const dirty = computed(() => mode.value === "writing" && text.value.trim() !== props.word.description);
    warnBeforeLeaving(dirty);

    async function show(next: typeof mode.value, focus: string) {
      mode.value = next;
      error.value = "";
      await nextTick();
      root.value?.querySelector<HTMLElement>(focus)?.focus();
    }

    function write() {
      text.value = props.word.description || drafted.value || "";
      void show("writing", "textarea");
    }

    async function store(description: string) {
      if (pending.value) return;
      pending.value = true;
      error.value = "";
      const failure = await props.save(description);
      pending.value = false;
      if (failure) error.value = failure;
      else await show("reading", ".edit-description");
    }

    return { mode, text, pending, error, root, drafted, show, write, store, MAX_DESCRIPTION };
  },
  template: `
    <section ref="root" class="description" aria-label="What this word means to you">
      <form v-if="mode === 'writing'" class="description-edit" @submit.prevent="store(text.trim())" :aria-busy="pending">
        <div class="field">
          <label :for="'description-' + word.association">What {{ word.label }} means to you</label>
          <textarea :id="'description-' + word.association" v-model="text" :maxlength="MAX_DESCRIPTION" rows="3" :readonly="pending"></textarea>
          <p class="field-hint">Leave this empty to show the draft from your picked qualities.</p>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <div class="form-actions">
          <button class="primary" :disabled="pending">{{ pending ? 'Saving…' : 'Save description' }}</button>
          <button class="action" type="button" :disabled="pending" @click="show('reading', '.edit-description')">Cancel</button>
        </div>
      </form>

      <template v-else>
        <p v-if="word.description || drafted" class="definition">{{ word.description || drafted }}</p>
        <div v-if="mode === 'replacing'" class="confirm" role="group" aria-labelledby="replace-description">
          <p id="replace-description">Replace your description with the draft? Your text will be deleted.</p>
          <div class="form-actions">
            <button class="primary danger" type="button" :disabled="pending" @click="store('')">{{ pending ? 'Replacing…' : 'Use the draft' }}</button>
            <button class="action keep-text" type="button" :disabled="pending" @click="show('reading', '.edit-description')">Keep my text</button>
          </div>
        </div>
        <div v-else class="card-actions is-centered">
          <button class="text-button edit-description" type="button" @click="write">Edit description</button>
          <button v-if="word.description && drafted" class="text-button" type="button" @click="show('replacing', '.keep-text')">Use the draft instead</button>
        </div>
      </template>
      <p v-if="error && mode !== 'writing'" class="error" role="alert">{{ error }}</p>
    </section>
  `,
});
