import { defineComponent } from "vue/dist/vue.esm-bundler.js";
import { fitLabel } from "../fitLabel.ts";

/** The record that carries a word at the top of its page. Decorative: the page heading names the word. */
export default defineComponent({
  directives: { fitLabel },
  props: {
    label: { type: String, required: true },
    placeholder: { type: Boolean, default: false },
  },
  template: `
    <div class="focus-disc" aria-hidden="true">
      <span class="sleeve-disc">
        <span class="spindle"></span>
        <span class="sleeve-word" :class="{ 'is-placeholder': placeholder }" v-fit-label="label">{{ label }}</span>
      </span>
    </div>
  `,
});
