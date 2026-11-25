import { defineComponent, onBeforeUnmount, onMounted, ref } from "vue/dist/vue.esm-bundler.js";

export default defineComponent({
  setup() {
    const root = ref<HTMLElement | null>(null);
    const shownBy = ref<"hover" | "focus" | "activation" | null>(null);

    function reveal(event: PointerEvent) {
      if (event.pointerType !== "touch" && !shownBy.value) shownBy.value = "hover";
    }

    function leave() {
      if (shownBy.value === "hover") shownBy.value = null;
    }

    function focus(event: FocusEvent) {
      if (shownBy.value !== "activation" && (event.currentTarget as HTMLElement).matches(":focus-visible")) {
        shownBy.value = "focus";
      }
    }

    function blur() {
      if (shownBy.value === "focus") shownBy.value = null;
    }

    function toggle() {
      shownBy.value = shownBy.value === "activation" ? null : "activation";
    }

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") shownBy.value = null;
    }

    function dismissOnOutsidePress(event: PointerEvent) {
      if (!root.value?.contains(event.target as Node)) shownBy.value = null;
    }

    onMounted(() => {
      document.addEventListener("keydown", dismissOnEscape);
      document.addEventListener("pointerdown", dismissOnOutsidePress);
    });
    onBeforeUnmount(() => {
      document.removeEventListener("keydown", dismissOnEscape);
      document.removeEventListener("pointerdown", dismissOnOutsidePress);
    });

    return { root, shownBy, reveal, leave, focus, blur, toggle };
  },
  template: `
    <div ref="root" class="word-page-help" @pointerenter="reveal" @pointerleave="leave">
      <button class="action word-page-help-button" type="button" aria-label="Help with this word page"
        aria-describedby="word-page-help-tip" aria-controls="word-page-help-tip" :aria-expanded="!!shownBy"
        @focus="focus" @blur="blur" @click="toggle">
        <span aria-hidden="true">?</span>
      </button>
      <div v-show="shownBy" id="word-page-help-tip" class="word-page-help-tip" role="tooltip">
        <p>Use this page to add songs that fit the word's description based on your own definition of what this word means. Then, personalize your description of what this word means musically based on the songs you chose. Share your word with friends to let them see your tastes for this word.</p>
      </div>
    </div>
  `,
});
