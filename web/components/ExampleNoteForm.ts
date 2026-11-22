import { defineComponent, onMounted, ref, useId, type PropType } from "vue/dist/vue.esm-bundler.js";
import type { ExampleNote } from "../wall.ts";

export default defineComponent({
  props: {
    initial: { type: Object as PropType<ExampleNote>, default: () => ({ role: "EXAMPLE", note: "" }) },
    submitLabel: { type: String, required: true },
    save: { type: Function as PropType<(explanation: ExampleNote) => Promise<string | undefined>>, required: true },
  },
  emits: ["cancel"],
  setup(props) {
    const role = ref(props.initial.role);
    const note = ref(props.initial.note);
    const noteId = useId();
    const noteInput = ref<HTMLTextAreaElement | null>(null);
    const pending = ref(false);
    const error = ref("");

    onMounted(() => noteInput.value?.focus());

    async function submit() {
      if (pending.value) return;
      error.value = "";
      const text = note.value.trim();
      if (!text) {
        error.value = "Explain why this example matters.";
        noteInput.value?.focus();
        return;
      }

      pending.value = true;
      try {
        error.value = (await props.save({ role: role.value, note: text })) ?? "";
      } catch {
        error.value = "Could not reach Sound It Out. Check your connection and try again.";
      } finally {
        pending.value = false;
      }
    }

    return { role, note, noteId, noteInput, pending, error, submit };
  },
  template: `
    <form class="example-note-form" novalidate @submit.prevent="submit" :aria-busy="pending">
      <fieldset :disabled="pending">
        <legend>Role</legend>
        <div class="choices">
          <label><input v-model="role" :name="noteId + '-role'" type="radio" value="EXAMPLE"> Example</label>
          <label><input v-model="role" :name="noteId + '-role'" type="radio" value="COUNTEREXAMPLE"> Counterexample</label>
        </div>
      </fieldset>
      <div class="field">
        <label :for="noteId">{{ role === 'EXAMPLE' ? 'Why it fits' : 'Why it falls short' }}</label>
        <textarea :id="noteId" ref="noteInput" v-model="note" rows="3" required :readonly="pending"
          :aria-describedby="error ? noteId + '-error' : undefined"></textarea>
      </div>
      <p v-if="error" :id="noteId + '-error'" class="error" role="alert">{{ error }}</p>
      <div class="form-actions">
        <button class="primary" :disabled="pending">{{ pending ? 'Saving…' : submitLabel }}</button>
        <button class="action" type="button" :disabled="pending" @click="$emit('cancel')">Cancel</button>
      </div>
    </form>
  `,
});
