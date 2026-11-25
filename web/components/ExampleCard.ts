import { computed, defineComponent, nextTick, ref, type PropType } from "vue/dist/vue.esm-bundler.js";
import { MAX_NOTE } from "../../shared/limits.ts";
import type { Example, Failure, PublicExample } from "../types.ts";
import { warnBeforeLeaving } from "../unsaved.ts";
import QualityPicker from "./QualityPicker.ts";
import TrackPlayer from "./TrackPlayer.ts";

/**
 * One song in a word: the track, the qualities picked for it, and the note. A visitor reads it; the
 * owner also sees who can see it and can edit or remove it.
 */
export default defineComponent({
  components: { QualityPicker, TrackPlayer },
  props: {
    example: { type: Object as PropType<Example | PublicExample>, required: true },
    word: { type: String, required: true },
    save: { type: Function as PropType<(example: Example, qualities: string[], note: string) => Promise<Failure>>, default: null },
    remove: { type: Function as PropType<(annotation: string) => Promise<Failure>>, default: null },
  },
  setup(props) {
    const mode = ref<"reading" | "editing" | "removing">("reading");
    const picked = ref<string[]>([]);
    const note = ref("");
    const pending = ref(false);
    const error = ref("");
    const root = ref<HTMLElement | null>(null);
    const owned = computed(() => "visibility" in props.example);
    const dirty = computed(() => mode.value === "editing" && (
      note.value.trim() !== props.example.note || [...picked.value].sort().join() !== props.example.qualities.join()
    ));
    warnBeforeLeaving(dirty);

    async function show(next: typeof mode.value, focus: string) {
      mode.value = next;
      error.value = "";
      await nextTick();
      root.value?.querySelector<HTMLElement>(focus)?.focus();
    }

    function edit() {
      picked.value = [...props.example.qualities];
      note.value = props.example.note;
      void show("editing", ".chip");
    }

    async function submit() {
      if (pending.value || !props.save) return;
      if (!dirty.value) return show("reading", ".edit-example");
      pending.value = true;
      error.value = "";
      const failure = await props.save(props.example as Example, picked.value, note.value.trim());
      pending.value = false;
      if (failure) error.value = failure;
      else await show("reading", ".edit-example");
    }

    async function confirmRemove() {
      if (pending.value || !props.remove) return;
      pending.value = true;
      error.value = "";
      const failure = await props.remove(props.example.annotation);
      pending.value = false;
      if (failure) error.value = failure;
    }

    return { mode, picked, note, pending, error, root, owned, show, edit, submit, confirmRemove, MAX_NOTE };
  },
  template: `
    <li ref="root" class="example" :class="{ counterexample: example.role === 'COUNTEREXAMPLE' }">
      <TrackPlayer :track="example.item">
        <span v-if="owned" class="audience">{{ example.visibility === 'SHARED' ? 'Shared' : 'Only you' }}</span>
      </TrackPlayer>
      <p v-if="example.role === 'COUNTEREXAMPLE'" class="section-label">Counterexample: what {{ word }} is not</p>

      <form v-if="mode === 'editing'" class="example-edit" @submit.prevent="submit" :aria-busy="pending">
        <QualityPicker v-model="picked" :disabled="pending" />
        <div class="field">
          <label :for="'note-' + example.annotation">
            {{ example.role === 'COUNTEREXAMPLE' ? 'Why doesn’t this song fit?' : 'Why does this song fit?' }}
            <span class="optional">optional</span>
          </label>
          <textarea :id="'note-' + example.annotation" v-model="note" :maxlength="MAX_NOTE" rows="2" :readonly="pending"></textarea>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <div class="form-actions">
          <button class="primary" :disabled="pending">{{ pending ? 'Saving…' : 'Save' }}</button>
          <button class="action" type="button" :disabled="pending" @click="show('reading', '.edit-example')">Cancel</button>
        </div>
      </form>

      <template v-else>
        <ul v-if="example.qualities.length" class="chips is-read" :aria-label="'Qualities picked for this song'">
          <li v-for="quality in example.qualities" :key="quality" class="chip">{{ quality }}</li>
        </ul>
        <div v-if="example.note" class="listening-note">
          <p class="section-label">Listening note</p>
          <p class="note">{{ example.note }}</p>
        </div>

        <div v-if="mode === 'removing'" class="confirm" role="group" :aria-labelledby="'remove-' + example.annotation">
          <p :id="'remove-' + example.annotation">Remove this song from {{ word }}? Your note and picked qualities will be deleted.</p>
          <div class="form-actions">
            <button class="primary danger" type="button" :disabled="pending" @click="confirmRemove">{{ pending ? 'Removing…' : 'Remove song' }}</button>
            <button class="action keep-example" type="button" :disabled="pending" @click="show('reading', '.remove-example')">Keep</button>
          </div>
        </div>
        <div v-else-if="save && remove" class="card-actions">
          <button class="text-button edit-example" type="button" @click="edit">Edit note and tags</button>
          <button class="text-button remove-example" type="button" @click="show('removing', '.keep-example')">Remove<span class="visually-hidden"> this song</span></button>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </template>
    </li>
  `,
});
