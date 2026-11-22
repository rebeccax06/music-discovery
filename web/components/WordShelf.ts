import { defineComponent, ref, type PropType } from "vue/dist/vue.esm-bundler.js";
import { fitLabel } from "../fitLabel.ts";
import { audienceOf } from "../audience.ts";
import type { PublicWord, Word } from "../types.ts";

type Shelved = Word | PublicWord;

function songs(word: Shelved) {
  return word.examples.filter(example => example.role === "EXAMPLE").length;
}

function waiting(word: Shelved) {
  return "suggestions" in word ? word.suggestions.filter(suggestion => suggestion.fit === "PENDING").length : 0;
}

/** What a sleeve says about its word, for the hover card and for screen readers. */
export function wordSummary(word: Shelved) {
  const count = songs(word);
  const parts = [count === 0 ? "Needs a song" : count === 1 ? "1 song" : `${count} songs`];
  parts.push(audienceOf(word.visibility).short);
  const pending = waiting(word);
  if (pending) parts.push(pending === 1 ? "1 suggestion to review" : `${pending} suggestions to review`);
  return parts.join(" · ");
}

/** A shelf of record sleeves, one per word, each saying who can open it. */
export default defineComponent({
  directives: { fitLabel },
  props: {
    words: { type: Array as PropType<Shelved[]>, required: true },
  },
  emits: ["open"],
  setup(_props, { emit }) {
    const leaving = ref<string | null>(null);

    async function choose(word: Shelved) {
      if (leaving.value) return;
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        leaving.value = word.association;
        await new Promise(resolve => setTimeout(resolve, 280));
        leaving.value = null;
      }
      emit("open", word);
    }

    return { leaving, choose, songs, waiting, wordSummary, audienceOf };
  },
  template: `
    <ul class="shelf" :class="{ 'is-leaving': leaving }" aria-label="Words">
      <li v-for="word in words" :key="word.association" class="slot"
        :class="{ 'needs-example': !songs(word), 'is-chosen': leaving === word.association }">
        <button class="sleeve" type="button" :data-association="word.association"
          :aria-label="word.label + ', ' + wordSummary(word)" @click="choose(word)">
          <span class="shelf-disc sleeve-disc" aria-hidden="true"></span>
          <span class="cover" aria-hidden="true">
            <span class="status-dot" :class="songs(word) ? 'fits' : 'needs'"></span>
            <span v-if="waiting(word)" class="badge">{{ waiting(word) }}</span>
            <span class="cover-word" v-fit-label="word.label">{{ word.label }}</span>
          </span>
          <span class="peek" aria-hidden="true">
            <span v-if="word.description" class="peek-text">{{ word.description }}</span>
            <span class="peek-status">{{ wordSummary(word) }}</span>
          </span>
        </button>
        <span class="slot-audience" aria-hidden="true">{{ audienceOf(word.visibility).short }}</span>
      </li>
    </ul>
  `,
});
