import { computed, defineComponent, nextTick, ref, useId, type PropType } from "vue/dist/vue.esm-bundler.js";
import type { Example, ExampleActions, ExampleNote } from "../wall.ts";
import ExampleNoteForm from "./ExampleNoteForm.ts";

export default defineComponent({
  components: { ExampleNoteForm },
  props: {
    association: { type: String, required: true },
    example: { type: Object as PropType<Example>, required: true },
    wordPublic: { type: Boolean, required: true },
    actions: { type: Object as PropType<ExampleActions>, required: true },
  },
  setup(props) {
    const editing = ref(false);
    const confirmingRemoval = ref(false);
    const confirmingShare = ref(false);
    const pending = ref(false);
    const error = ref("");
    const status = ref("");
    const confirmId = useId();
    const editButton = ref<HTMLButtonElement | null>(null);
    const shareButton = ref<HTMLButtonElement | null>(null);
    const removeButton = ref<HTMLButtonElement | null>(null);
    const cancelButton = ref<HTMLButtonElement | null>(null);
    const shared = computed(() => props.example.visibility === "SHARED");
    const visibilityLabel = computed(() => {
      if (!shared.value) return "Private note";
      return props.wordPublic ? "Shared on your public wall" : "Shared when this word is public";
    });

    function startEditing() {
      status.value = "";
      error.value = "";
      editing.value = true;
    }

    async function stopEditing() {
      editing.value = false;
      await nextTick();
      editButton.value?.focus();
    }

    async function update(explanation: ExampleNote) {
      const failure = await props.actions.update(props.association, props.example.annotation, explanation);
      if (failure) return failure;
      status.value = "Explanation saved.";
      await stopEditing();
    }

    async function prompt(kind: "share" | "remove") {
      error.value = "";
      status.value = "";
      confirmingShare.value = kind === "share";
      confirmingRemoval.value = kind === "remove";
      await nextTick();
      cancelButton.value?.focus();
    }

    async function cancelPrompt() {
      const focus = confirmingRemoval.value ? removeButton : shareButton;
      confirmingShare.value = false;
      confirmingRemoval.value = false;
      error.value = "";
      await nextTick();
      focus.value?.focus();
    }

    async function run(action: () => Promise<string | undefined>) {
      if (pending.value) return false;
      pending.value = true;
      error.value = "";
      status.value = "";
      try {
        error.value = (await action()) ?? "";
      } catch {
        error.value = "Could not reach Sound It Out. Check your connection and try again.";
      } finally {
        pending.value = false;
      }
      return !error.value;
    }

    async function setVisibility() {
      const visibility = shared.value ? "PRIVATE" : "SHARED";
      if (await run(() => props.actions.setVisibility(props.association, props.example.annotation, visibility))) {
        await cancelPrompt();
        status.value = visibility === "PRIVATE" ? "Example made private." : visibilityLabel.value + ".";
      }
    }

    async function remove() {
      if (await run(() => props.actions.remove(props.association, props.example.annotation))) {
        document.getElementById("open-record")?.focus({ preventScroll: true });
      }
    }

    return {
      editing, confirmingRemoval, confirmingShare, pending, error, status, confirmId, editButton, shareButton,
      removeButton, cancelButton, shared, visibilityLabel, startEditing, stopEditing, update, prompt,
      cancelPrompt, setVisibility, remove,
    };
  },
  template: `
    <template v-if="editing">
      <p v-if="shared && wordPublic" class="meta">Changes will appear on your public wall.</p>
      <ExampleNoteForm :initial="example" submit-label="Save explanation" :save="update" @cancel="stopEditing" />
    </template>
    <template v-else>
      <p class="section-label">{{ example.role === 'COUNTEREXAMPLE' ? 'Counterexample' : 'Example' }}</p>
      <p class="note">{{ example.note }}</p>
      <p class="meta">{{ visibilityLabel }}</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div v-if="confirmingShare || confirmingRemoval" class="confirm" role="group" :aria-labelledby="confirmId">
        <p :id="confirmId" v-if="confirmingRemoval">Remove this example and its explanation?</p>
        <p :id="confirmId" v-else>{{ wordPublic ? 'Show this explanation to visitors on your public wall?' : 'Show this explanation to visitors when this word is public?' }}</p>
        <div class="form-actions">
          <button v-if="confirmingRemoval" class="primary danger" type="button" :disabled="pending" @click="remove">Remove example</button>
          <button v-else class="primary" type="button" :disabled="pending" @click="setVisibility">Share example</button>
          <button ref="cancelButton" class="action" type="button" :disabled="pending" @click="cancelPrompt">Cancel</button>
        </div>
      </div>
      <div v-else class="form-actions example-actions">
        <button ref="editButton" class="action" type="button" :disabled="pending" @click="startEditing">Edit explanation</button>
        <button ref="shareButton" class="action" type="button" :disabled="pending" @click="shared ? setVisibility() : prompt('share')">
          {{ shared ? 'Make example private' : 'Share example' }}
        </button>
        <button ref="removeButton" class="action" type="button" :disabled="pending" @click="prompt('remove')">Remove example</button>
      </div>
      <p v-if="status" role="status" class="visually-hidden">{{ status }}</p>
    </template>
  `,
});
