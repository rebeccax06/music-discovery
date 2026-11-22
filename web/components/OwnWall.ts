import { computed, defineComponent, nextTick, ref, watch, type PropType } from "vue/dist/vue.esm-bundler.js";
import { address, go, route, wordKey } from "../route.ts";
import { notify } from "../toast.ts";
import type { Wall } from "../wall.ts";
import AddWord from "./AddWord.ts";
import WordPage from "./WordPage.ts";
import WordShelf from "./WordShelf.ts";

const ORGANIZE_FROM = 6;
type Filter = "all" | "needs-song" | "has-songs" | "PRIVATE" | "LIMITED" | "PUBLIC";

/** The signed-in person's wall: the shelf of their words, adding a word, and the page for one word. */
export default defineComponent({
  components: { AddWord, WordPage, WordShelf },
  props: {
    username: { type: String, required: true },
    wall: { type: Object as PropType<Wall>, required: true },
  },
  setup(props) {
    const heading = ref<HTMLElement | null>(null);
    const adding = ref(false);
    const search = ref("");
    const filter = ref<Filter>("all");
    const error = ref("");
    const words = computed(() => props.wall.words.value);
    const selected = computed(() => words.value.find(word => wordKey(word.label) === route.word) ?? null);
    const unknownWord = computed(() => route.word && !selected.value && !props.wall.loading.value ? route.word : "");
    const showAdd = computed(() => !selected.value && (adding.value || words.value.length === 0));
    const organize = computed(() => words.value.length >= ORGANIZE_FROM);
    const sharedCount = computed(() => words.value.filter(word => word.visibility !== "PRIVATE").length);
    const publicCount = computed(() => words.value.filter(word => word.visibility === "PUBLIC").length);
    const wallLink = computed(() => address({ wall: props.username }).toString());
    const shown = computed(() => {
      const wanted = search.value.trim().toLowerCase();
      return words.value.filter(word => {
        if (wanted && !word.label.toLowerCase().includes(wanted)) return false;
        const hasSong = word.examples.some(example => example.role === "EXAMPLE");
        if (filter.value === "needs-song") return !hasSong;
        if (filter.value === "has-songs") return hasSong;
        if (filter.value === "all") return true;
        return word.visibility === filter.value;
      });
    });

    // Moving between the shelf and a word is a natural moment to pick up what friends have sent.
    watch(() => route.word, () => { void props.wall.load({ quiet: true }); });

    // Returning to the shelf puts focus back on the word that was open, or on the heading.
    watch(selected, async (now, before) => {
      if (now || !before) return;
      await nextTick();
      const sleeve = document.querySelector<HTMLElement>(`.sleeve[data-association="${CSS.escape(before.association)}"]`);
      (sleeve ?? heading.value)?.focus();
    });

    function open(label: string) {
      adding.value = false;
      search.value = "";
      filter.value = "all";
      go({ word: wordKey(label) });
    }

    async function startAdding() {
      adding.value = true;
      await nextTick();
      document.getElementById("add-heading")?.focus();
    }

    /**
     * Creating a word removes the add screen, so the add screen cannot be the one to move on. The wall
     * creates the word and opens it in one step.
     */
    async function create(label: string) {
      const failure = await props.wall.createWord(label);
      if (!failure) {
        notify(`Added ${label} · only you can see it`);
        open(label);
      }
      return failure;
    }

    async function copyWallLink() {
      try {
        await navigator.clipboard.writeText(wallLink.value);
        notify("Wall link copied");
      } catch {
        notify(wallLink.value);
      }
    }

    return {
      heading, adding, search, filter, error, words, selected, unknownWord, showAdd, organize,
      sharedCount, publicCount, shown, open, create, startAdding, copyWallLink, go, wordKey,
    };
  },
  template: `
    <section class="own-wall">
      <p v-if="wall.loading.value" role="status">Loading your Sound Wall…</p>
      <div v-else-if="wall.loadError.value" class="account-panel">
        <p class="error" role="alert">{{ wall.loadError.value }}</p>
        <button class="primary" type="button" @click="wall.load()">Try again</button>
      </div>

      <WordPage v-else-if="selected" :key="selected.association" :word="selected" :username="username" :wall="wall"
        @close="go({})" @renamed="go({ word: wordKey($event) }, { replace: true })" @removed="go({}, { replace: true })" />

      <template v-else-if="showAdd">
        <button v-if="words.length" class="back-link" type="button" @click="adding = false">← All words</button>
        <AddWord :words="words" :create="create" @open="open" @cancel="adding = false" />
      </template>

      <template v-else>
        <h1 ref="heading" tabindex="-1">Your Sound Wall</h1>
        <p class="lead">Each word is yours: a friend can use the same word without changing what it means to you.</p>
        <p v-if="unknownWord" class="notice" role="status">You have no word called “{{ unknownWord }}”. Here are your words.</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <div class="wall-toolbar">
          <p class="meta">{{ words.length === 1 ? '1 word' : words.length + ' words' }} · {{ sharedCount }} shared</p>
          <input v-if="organize" v-model="search" class="search" type="search" placeholder="Find a word" aria-label="Find a word" autocomplete="off">
          <div class="toolbar-actions">
            <button v-if="publicCount" class="action" type="button" @click="copyWallLink">Copy wall link</button>
            <button class="primary add-word-button" type="button" @click="startAdding">Add word</button>
          </div>
        </div>
        <div v-if="organize" class="filters" role="group" aria-label="Show words">
          <button class="filter" type="button" :aria-pressed="filter === 'all'" @click="filter = 'all'">All</button>
          <button class="filter" type="button" :aria-pressed="filter === 'needs-song'" @click="filter = 'needs-song'"><span class="status-dot needs" aria-hidden="true"></span>Needs a song</button>
          <button class="filter" type="button" :aria-pressed="filter === 'has-songs'" @click="filter = 'has-songs'"><span class="status-dot fits" aria-hidden="true"></span>Has songs</button>
          <button class="filter" type="button" :aria-pressed="filter === 'PRIVATE'" @click="filter = 'PRIVATE'">Private</button>
          <button class="filter" type="button" :aria-pressed="filter === 'LIMITED'" @click="filter = 'LIMITED'">Friends</button>
          <button class="filter" type="button" :aria-pressed="filter === 'PUBLIC'" @click="filter = 'PUBLIC'">Public</button>
        </div>
        <p v-if="!shown.length && search.trim()" class="meta" role="status">No words match “{{ search.trim() }}”.</p>
        <p v-else-if="!shown.length" class="meta" role="status">No words in this view.</p>
        <WordShelf v-else :words="shown" @open="open($event.label)" />
      </template>
    </section>
  `,
});
