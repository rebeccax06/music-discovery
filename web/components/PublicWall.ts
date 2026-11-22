import { computed, defineComponent, nextTick, ref, type PropType } from "vue/dist/vue.esm-bundler.js";
import type { SharedWall, SharedWord } from "../wall.ts";
import { fitLabel } from "../fitLabel.ts";

export default defineComponent({
  directives: { fitLabel },
  props: {
    wall: { type: Object as PropType<SharedWall>, required: true },
    signedIn: { type: Boolean, required: true },
  },
  emits: ["back"],
  setup(props) {
    const openId = ref<string | null>(null);
    const open = computed(() => props.wall.words.find(word => word.association === openId.value) ?? null);

    async function choose(word: SharedWord) {
      openId.value = word.association;
      await nextTick();
      document.getElementById("public-record")?.focus({ preventScroll: true });
    }

    async function close() {
      const id = openId.value;
      openId.value = null;
      await nextTick();
      if (id) document.querySelector<HTMLElement>(`.sleeve[data-association="${CSS.escape(id)}"]`)?.focus();
    }

    function hasExample(word: SharedWord) {
      return word.examples.some(example => example.role === "EXAMPLE");
    }

    function summary(word: SharedWord) {
      const count = word.examples.filter(example => example.role === "EXAMPLE").length;
      if (!count) return "Needs an example";
      return count === 1 ? "1 example" : `${count} examples`;
    }

    return { open, choose, close, hasExample, summary };
  },
  template: `
    <section class="public-wall">
      <button v-if="signedIn && !open" class="back-link" type="button" @click="$emit('back')">← Your Sound Wall</button>
      <template v-if="!open">
        <p v-if="!wall.words.length" class="meta">{{ wall.owner }} hasn’t made any words public yet.</p>
        <template v-else>
          <p class="legend" aria-hidden="true">
            <span><span class="status-dot needs"></span>Needs an example</span>
            <span><span class="status-dot fits"></span>Has examples</span>
          </p>
          <ul class="shelf" aria-label="Words">
            <li v-for="word in wall.words" :key="word.association" class="slot" :class="{ 'needs-example': !hasExample(word) }">
              <button class="sleeve" type="button" :data-association="word.association"
                :aria-label="word.label + ', ' + summary(word)" @click="choose(word)">
                <span class="shelf-disc sleeve-disc" aria-hidden="true"></span>
                <span class="cover" aria-hidden="true">
                  <span class="status-dot" :class="hasExample(word) ? 'fits' : 'needs'"></span>
                  <span class="cover-word" v-fit-label="word.label">{{ word.label }}</span>
                </span>
                <span class="peek" aria-hidden="true">
                  <span class="peek-text">{{ word.description }}</span>
                  <span class="peek-status">{{ summary(word) }}</span>
                </span>
              </button>
            </li>
          </ul>
        </template>
      </template>
      <template v-else>
        <button class="back-link" type="button" @click="close">← {{ wall.owner }}’s words</button>
        <article id="public-record" :key="open.association" class="stage" :class="{ 'needs-example': open.examples.length === 0 }" tabindex="-1" :aria-label="open.label">
          <h2 class="visually-hidden">{{ open.label }}</h2>
          <div class="focus-disc" aria-hidden="true">
            <span class="sleeve-disc">
              <span class="spindle"></span>
              <span class="sleeve-word" v-fit-label="open.label">{{ open.label }}</span>
            </span>
          </div>
          <p class="definition">{{ open.description }}</p>
          <section v-if="open.examples.length" class="record-section" aria-labelledby="public-examples">
            <h3 id="public-examples" class="section-label">Examples</h3>
            <ul class="examples">
              <li v-for="example in open.examples" :key="example.annotation" class="example" :class="{ counterexample: example.role === 'COUNTEREXAMPLE' }">
                <p class="section-label">{{ example.role === 'COUNTEREXAMPLE' ? 'Counterexample' : 'Example' }}</p>
                <p class="note">{{ example.note }}</p>
              </li>
            </ul>
          </section>
        </article>
      </template>
    </section>
  `,
});
