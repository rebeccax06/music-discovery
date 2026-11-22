import { computed, defineComponent, type PropType } from "vue/dist/vue.esm-bundler.js";
import { draft } from "../../shared/draft.ts";
import type { PublicWord } from "../types.ts";
import ExampleCard from "./ExampleCard.ts";

/**
 * What a visitor reads for a public word: its description and the songs its owner shared. The
 * visitor's page and the owner's preview both render this from the public endpoint's answer.
 */
export default defineComponent({
  components: { ExampleCard },
  props: {
    word: { type: Object as PropType<PublicWord>, required: true },
    owner: { type: String, required: true },
  },
  setup(props) {
    const drafted = computed(() => draft(props.word.label, props.word.examples, { owner: false, name: props.owner }));
    return { drafted };
  },
  template: `
    <div class="shared-word">
      <p v-if="word.description" class="definition">{{ word.description }}</p>
      <template v-else-if="drafted">
        <p class="definition is-draft">{{ drafted }}</p>
        <p class="meta draft-label">From the qualities {{ owner }} picked for these songs.</p>
      </template>
      <section class="record-section" aria-label="Songs">
        <h3 class="section-heading">Songs</h3>
        <p v-if="!word.examples.length" class="meta">{{ owner }} hasn’t shared any songs for this word yet.</p>
        <ul v-else class="examples">
          <ExampleCard v-for="example in word.examples" :key="example.annotation" :example="example" :word="word.label" />
        </ul>
      </section>
    </div>
  `,
});
