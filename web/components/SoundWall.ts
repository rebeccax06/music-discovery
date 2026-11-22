import { computed, defineComponent, nextTick, onBeforeUnmount, ref, watch, type PropType } from "vue/dist/vue.esm-bundler.js";
import { fitLabel } from "../fitLabel.ts";
import { wallUrl, type useWall, type Word } from "../wall.ts";

type Wall = ReturnType<typeof useWall>;

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function wordSummary(word: Word) {
  const examples = word.examples.filter(example => example.role === "EXAMPLE").length;
  const counters = word.examples.filter(example => example.role === "COUNTEREXAMPLE").length;
  if (examples === 0) {
    return counters === 0 ? "Needs an example" : `Needs an example · ${countLabel(counters, "counterexample", "counterexamples")}`;
  }
  const parts = [countLabel(examples, "example", "examples")];
  if (counters) parts.push(countLabel(counters, "counterexample", "counterexamples"));
  return parts.join(" · ");
}

export function needsExample(word: Word) {
  return word.examples.every(example => example.role !== "EXAMPLE");
}

function shownLabel(label: string) {
  return label.trim().replace(/\s+/g, " ");
}

const SEARCH_FROM = 6;

export const MAX_WORD = 40;

export default defineComponent({
  directives: { fitLabel },
  props: {
    username: { type: String, required: true },
    words: { type: Array as PropType<Word[]>, required: true },
    loading: { type: Boolean, required: true },
    loadError: { type: String, required: true },
    openId: { type: String as PropType<string | null>, default: null },
    reload: { type: Function as PropType<Wall["load"]>, required: true },
    createWord: { type: Function as PropType<Wall["createWord"]>, required: true },
    saveWord: { type: Function as PropType<Wall["saveWord"]>, required: true },
    setVisibility: { type: Function as PropType<Wall["setVisibility"]>, required: true },
    removeWord: { type: Function as PropType<Wall["removeWord"]>, required: true },
  },
  setup(props) {
    const adding = ref(false);
    const label = ref("");
    const description = ref("");
    const filter = ref<"all" | "private" | "public" | "needs-example" | "has-examples">("all");
    const selectedId = ref<string | null>(null);
    const editing = ref(false);
    const revealedLink = ref(false);
    const publicCount = computed(() => props.words.filter(word => word.visibility === "PUBLIC").length);
    const publicWallUrl = computed(() => wallUrl(props.username));
    const draftLabel = ref("");
    const draftDescription = ref("");
    const discarding = ref<null | (() => void)>(null);
    const search = ref("");
    const confirming = ref("");
    const pending = ref("");
    const status = ref("");
    const createError = ref("");
    const cardError = ref<Record<string, string>>({});
    const showForm = computed(() => adding.value || props.words.length === 0);
    const showSearch = computed(() => props.words.length >= SEARCH_FROM);
    const visibleWords = computed(() => {
      const query = shownLabel(search.value).toLowerCase();
      return props.words.filter(word => {
        if (query && !word.label.toLowerCase().includes(query)) return false;
        if (filter.value === "private") return word.visibility === "PRIVATE";
        if (filter.value === "public") return word.visibility === "PUBLIC";
        if (filter.value === "needs-example") return needsExample(word);
        if (filter.value === "has-examples") return !needsExample(word);
        return true;
      });
    });
    const selected = computed(() => props.words.find(word => word.association === selectedId.value) ?? null);
    const leavingId = ref<string | null>(null);

    function existing(label: string, except?: string) {
      const wanted = shownLabel(label).toLowerCase();
      if (!wanted) return null;
      return props.words.find(word => word.association !== except && word.label.toLowerCase() === wanted) ?? null;
    }
    const addDuplicate = computed(() => existing(label.value));
    const editDuplicate = computed(() => existing(draftLabel.value, selected.value?.association));
    const addDirty = computed(() => !!(label.value.trim() || description.value.trim()));
    const editDirty = computed(() => editing.value && !!selected.value && (
      shownLabel(draftLabel.value) !== selected.value.label || draftDescription.value.trim() !== selected.value.description
    ));

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (addDirty.value || editDirty.value) event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    onBeforeUnmount(() => window.removeEventListener("beforeunload", warnBeforeUnload));

    watch(() => props.openId, async (id) => {
      if (!id) return;
      filter.value = "all";
      search.value = "";
      await placeRecord(id);
    }, { immediate: true });

    async function addWord() {
      if (pending.value) return;
      createError.value = "";
      status.value = "";
      const shown = label.value.trim().replace(/\s+/g, " ");
      const text = description.value.trim();
      if (!shown || !text) {
        createError.value = "Provide a word and a description.";
        return;
      }
      if (addDuplicate.value) return;
      if (shown.length > MAX_WORD) {
        createError.value = `Use a word of ${MAX_WORD} characters or fewer.`;
        return;
      }
      if (text.length > 500) {
        createError.value = "Use a description of 500 characters or fewer.";
        return;
      }
      pending.value = "create";
      try {
        const failure = await props.createWord(shown, text, "PRIVATE");
        if (failure) createError.value = failure;
        else {
          toast(`Added ${shown}`);
          label.value = "";
          description.value = "";
          adding.value = false;
        }
      } catch {
        createError.value = "Could not reach Sound It Out. Check your connection and try again.";
      } finally {
        pending.value = "";
      }
    }

    async function save(word: Word) {
      if (pending.value) return;
      cardError.value = { ...cardError.value, [word.association]: "" };
      status.value = "";
      const shown = shownLabel(draftLabel.value);
      const text = draftDescription.value.trim();
      if (!shown || !text) {
        cardError.value = { ...cardError.value, [word.association]: "Provide a word and a description." };
        return;
      }
      if (editDuplicate.value) return;
      if (shown.length > MAX_WORD) {
        cardError.value = { ...cardError.value, [word.association]: `Use a word of ${MAX_WORD} characters or fewer.` };
        return;
      }
      if (text.length > 500) {
        cardError.value = { ...cardError.value, [word.association]: "Use a description of 500 characters or fewer." };
        return;
      }
      const renamed = shown !== word.label;
      const described = text !== word.description;
      if (!renamed && !described) {
        await turnOver();
        return;
      }
      pending.value = word.association;
      try {
        const failure = await props.saveWord(word.association, shown, text);
        if (failure) cardError.value = { ...cardError.value, [word.association]: failure };
        else {
          toast(renamed && described ? "Changes saved" : renamed ? `Renamed to ${shown}` : "Description saved");
          await turnOver();
        }
      } catch {
        cardError.value = { ...cardError.value, [word.association]: "Could not reach Sound It Out. Check your connection and try again." };
      } finally {
        pending.value = "";
      }
    }

    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    function toast(message: string) {
      clearTimeout(toastTimer);
      status.value = message;
      toastTimer = setTimeout(() => { status.value = ""; }, 2600);
    }

    async function share(word: Word) {
      if (pending.value) return;
      const next = word.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
      pending.value = word.association;
      cardError.value = { ...cardError.value, [word.association]: "" };
      status.value = "";
      try {
        const failure = await props.setVisibility(word.association, next);
        if (failure) cardError.value = { ...cardError.value, [word.association]: failure };
        else toast(next === "PUBLIC" ? "Added to your public wall" : "Removed from your public wall");
      } catch {
        cardError.value = { ...cardError.value, [word.association]: "Could not reach Sound It Out. Check your connection and try again." };
      } finally {
        pending.value = "";
      }
    }

    async function copyWallLink() {
      try {
        await navigator.clipboard.writeText(publicWallUrl.value);
        toast("Wall link copied");
      } catch {
        revealedLink.value = true;
      }
    }

    function unlessDirty(dirty: boolean, leave: () => void) {
      if (dirty) discarding.value = leave;
      else leave();
    }

    function discard() {
      const leave = discarding.value;
      discarding.value = null;
      leave?.();
    }

    function cancelEdit(word: Word) {
      unlessDirty(editDirty.value, () => {
        cardError.value = { ...cardError.value, [word.association]: "" };
        void turnOver();
      });
    }

    function cancelAdd() {
      unlessDirty(addDirty.value, async () => {
        label.value = "";
        description.value = "";
        createError.value = "";
        adding.value = false;
        await nextTick();
        document.querySelector<HTMLElement>(".wall-toolbar .primary")?.focus();
      });
    }

    async function startAdd() {
      adding.value = true;
      await nextTick();
      document.getElementById("new-word")?.focus();
    }

    function addFromSearch() {
      label.value = shownLabel(search.value);
      search.value = "";
      adding.value = true;
      void nextTick(() => document.getElementById("new-description")?.focus());
    }

    async function openExisting(word: Word) {
      label.value = "";
      description.value = "";
      createError.value = "";
      adding.value = false;
      await placeRecord(word.association);
    }

    async function confirmRemove(word: Word) {
      if (pending.value) return;
      pending.value = word.association;
      cardError.value = { ...cardError.value, [word.association]: "" };
      status.value = "";
      try {
        const failure = await props.removeWord(word.association);
        if (failure) cardError.value = { ...cardError.value, [word.association]: failure };
        else {
          confirming.value = "";
          toast(`Removed ${word.label}`);
        }
      } catch {
        cardError.value = { ...cardError.value, [word.association]: "Could not reach Sound It Out. Check your connection and try again." };
      } finally {
        pending.value = "";
      }
    }

    async function placeRecord(id: string) {
      editing.value = false;
      discarding.value = null;
      revealedLink.value = false;
      confirming.value = "";
      selectedId.value = id;
      await nextTick();
      document.getElementById("open-record")?.focus({ preventScroll: true });
    }

    async function choose(word: Word) {
      if (leavingId.value) return;
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        leavingId.value = word.association;
        await new Promise(resolve => setTimeout(resolve, 280));
        leavingId.value = null;
      }
      await placeRecord(word.association);
    }

    function closeRecord() {
      unlessDirty(editDirty.value, async () => {
        const id = selectedId.value;
        selectedId.value = null;
        editing.value = false;
        await nextTick();
        if (id) document.querySelector<HTMLElement>(`.sleeve[data-association="${CSS.escape(id)}"]`)?.focus();
      });
    }

    async function turnOver() {
      discarding.value = null;
      if (!editing.value && selected.value) {
        draftLabel.value = selected.value.label;
        draftDescription.value = selected.value.description;
      }
      editing.value = !editing.value;
      await nextTick();
      const record = document.getElementById("open-record");
      const focusTarget = editing.value
        ? record?.querySelector<HTMLElement>("textarea")
        : record?.querySelector<HTMLElement>(".edit-toggle");
      focusTarget?.focus();
    }

    return {
      adding, label, description, filter, search, selected, editing, revealedLink, draftLabel, draftDescription,
      discarding, confirming, pending, status, createError, cardError, showForm, showSearch, visibleWords, leavingId,
      addDuplicate, editDuplicate, publicCount, publicWallUrl, addWord, save, share, copyWallLink, cancelEdit, cancelAdd, discard, startAdd, addFromSearch,
      openExisting, confirmRemove, choose, closeRecord, turnOver, wordSummary, needsExample, MAX_WORD,
    };
  },
  template: `
    <section>
      <p class="lead">Define a word the way you hear it. A friend can use the same word without changing yours.</p>
      <p v-if="loading" role="status">Loading your Sound Wall…</p>
      <div v-else-if="loadError" class="account-panel">
        <p class="error" role="alert">{{ loadError }}</p>
        <button class="primary" type="button" @click="reload()">Try again</button>
      </div>
      <template v-else>
        <p class="toast" :class="{ 'is-shown': status }" role="status">{{ status }}</p>
        <template v-if="showForm && !selected">
          <button v-if="words.length" class="back-link" type="button" @click="cancelAdd">← All words</button>
          <section class="stage needs-example" aria-labelledby="add-heading">
            <h2 id="add-heading" class="visually-hidden">Add a word</h2>
            <div class="focus-disc" aria-hidden="true">
              <span class="sleeve-disc">
                <span class="spindle"></span>
                <span class="sleeve-word" :class="{ 'is-placeholder': !label.trim() }" v-fit-label="label.trim() || 'Your word'">{{ label.trim() || 'Your word' }}</span>
              </span>
            </div>
        <form id="add-word" class="stage-edit" aria-label="Add a word" @submit.prevent="addWord" :aria-busy="pending === 'create'">
          <div class="field">
            <label for="new-word">Word</label>
            <input id="new-word" v-model="label" name="label" required :maxlength="MAX_WORD" autocomplete="off" autocapitalize="words" :readonly="pending === 'create'">
            <p v-if="addDuplicate" class="field-hint" role="status">
              You already have <button class="text-button" type="button" @click="openExisting(addDuplicate)">{{ addDuplicate.label }}</button>.
            </p>
          </div>
          <div class="field">
            <label for="new-description">What it means to you</label>
            <textarea id="new-description" v-model="description" name="description" required maxlength="500" :readonly="pending === 'create'"></textarea>
          </div>
          <p v-if="createError" class="error" role="alert">{{ createError }}</p>
          <div v-if="discarding" class="form-actions discard" role="group" aria-label="Discard this word?">
            <span>Discard this word?</span>
            <button class="primary" type="button" @click="discard">Discard</button>
            <button class="action" type="button" @click="discarding = null">Keep writing</button>
          </div>
          <div v-else class="form-actions">
            <button class="primary" :disabled="pending === 'create' || !!addDuplicate">{{ pending === 'create' ? 'Adding…' : 'Add' }}</button>
            <button v-if="words.length" class="action" type="button" :disabled="pending === 'create'" @click="cancelAdd">Cancel</button>
          </div>
        </form>
          </section>
        </template>
        <template v-if="!selected && !showForm">
        <div class="wall-toolbar" :class="{ 'is-leaving': leavingId }">
          <p class="meta">{{ words.length === 1 ? '1 word' : words.length + ' words' }}<template v-if="words.length"> · {{ publicCount }} public</template></p>
          <input v-if="showSearch" v-model="search" class="search" type="search" placeholder="Find a word" aria-label="Find a word" autocomplete="off">
          <div class="toolbar-actions">
            <button v-if="publicCount" class="action" type="button" @click="copyWallLink">Copy wall link</button>
            <button class="primary" type="button" @click="startAdd">Add word</button>
          </div>
        </div>
        <p v-if="revealedLink" class="meta share-url">{{ publicWallUrl }}</p>
        <div v-if="words.length" class="filters" :class="{ 'is-leaving': leavingId }" role="group" aria-label="Organize words">
          <button class="filter" type="button" :aria-pressed="filter === 'all'" @click="filter = 'all'">All</button>
          <button class="filter" type="button" :aria-pressed="filter === 'needs-example'" @click="filter = 'needs-example'"><span class="status-dot needs" aria-hidden="true"></span>Needs an example</button>
          <button class="filter" type="button" :aria-pressed="filter === 'has-examples'" @click="filter = 'has-examples'"><span class="status-dot fits" aria-hidden="true"></span>Has examples</button>
          <button class="filter" type="button" :aria-pressed="filter === 'private'" @click="filter = 'private'">Private</button>
          <button class="filter" type="button" :aria-pressed="filter === 'public'" @click="filter = 'public'">Public</button>
        </div>
        <p v-if="words.length && !visibleWords.length && search.trim()" class="meta">
          No words match “{{ search.trim() }}”.
          <button class="text-button" type="button" @click="addFromSearch">Add it</button>
        </p>
        <p v-else-if="words.length && !visibleWords.length" class="meta">No words in this view.</p>
        <ul v-if="visibleWords.length" class="shelf" :class="{ 'is-leaving': leavingId }" aria-label="Words">
          <li v-for="word in visibleWords" :key="word.association" class="slot"
            :class="{ 'needs-example': needsExample(word), 'is-chosen': leavingId === word.association }">
            <button class="sleeve" type="button" :data-association="word.association"
              :aria-label="word.label + ', ' + wordSummary(word)" @click="choose(word)">
              <span class="shelf-disc sleeve-disc" aria-hidden="true"></span>
              <span class="cover" aria-hidden="true">
                <span class="status-dot" :class="needsExample(word) ? 'needs' : 'fits'"></span>
                <span class="cover-word" v-fit-label="word.label">{{ word.label }}</span>
              </span>
              <span class="peek" aria-hidden="true">
                <span class="peek-text">{{ word.description }}</span>
                <span class="peek-status">{{ wordSummary(word) }}</span>
              </span>
            </button>
            <button class="switch" type="button" role="switch" :aria-checked="word.visibility === 'PUBLIC' ? 'true' : 'false'"
              :aria-label="'Show ' + word.label + ' on your public wall'" :disabled="pending === word.association" @click="share(word)">
              <span class="track" aria-hidden="true"></span>Public
            </button>
          </li>
        </ul>
        </template>
        <template v-if="selected">
          <button class="back-link" type="button" @click="closeRecord">← All words</button>
          <article id="open-record" :key="selected.association" class="stage" :class="{ 'needs-example': needsExample(selected) }" tabindex="-1" :aria-label="selected.label">
            <h2 class="visually-hidden">{{ selected.label }}</h2>
            <div class="focus-disc" aria-hidden="true">
              <span class="sleeve-disc">
                <span class="spindle"></span>
                <span class="sleeve-word" v-fit-label="editing && draftLabel.trim() ? draftLabel.trim() : selected.label">{{ editing && draftLabel.trim() ? draftLabel.trim() : selected.label }}</span>
              </span>
            </div>
            <form v-if="editing" class="stage-edit" @submit.prevent="save(selected)">
              <div class="field">
                <label :for="'label-' + selected.association">Word</label>
                <input :id="'label-' + selected.association" v-model="draftLabel" :maxlength="MAX_WORD" autocomplete="off" :readonly="pending === selected.association">
                <p v-if="editDuplicate" class="field-hint" role="status">You already have {{ editDuplicate.label }}.</p>
              </div>
              <div class="field">
                <label :for="'description-' + selected.association">What it means to you</label>
                <textarea :id="'description-' + selected.association" v-model="draftDescription" maxlength="500" :readonly="pending === selected.association"></textarea>
              </div>
              <p v-if="cardError[selected.association]" class="error" role="alert">{{ cardError[selected.association] }}</p>
              <div v-if="discarding" class="form-actions discard" role="group" aria-label="Discard your changes?">
                <span>Discard your changes?</span>
                <button class="primary" type="button" @click="discard">Discard</button>
                <button class="action" type="button" @click="discarding = null">Keep editing</button>
              </div>
              <div v-else class="form-actions">
                <button class="primary" :disabled="pending === selected.association || !!editDuplicate">{{ pending === selected.association ? 'Saving…' : 'Save' }}</button>
                <button class="action" type="button" :disabled="pending === selected.association" @click="cancelEdit(selected)">Cancel</button>
              </div>
            </form>
            <template v-else>
              <p class="definition">{{ selected.description }}</p>
              <div v-if="confirming !== selected.association" class="action-row">
                <button class="action edit-toggle" type="button" @click="turnOver">Edit</button>
                <button class="action" type="button" :disabled="pending === selected.association" @click="share(selected)">
                  {{ selected.visibility === 'PUBLIC' ? 'Make private' : 'Make public' }}
                </button>
                <button class="action" type="button" @click="confirming = selected.association">Remove</button>
              </div>
              <div v-else class="confirm" role="group" :aria-labelledby="'confirm-' + selected.association">
                <p :id="'confirm-' + selected.association">Remove {{ selected.label }} and its examples?</p>
                <div class="form-actions">
                  <button class="primary danger" type="button" :disabled="pending === selected.association" @click="confirmRemove(selected)">Remove</button>
                  <button class="action" type="button" :disabled="pending === selected.association" @click="confirming = ''">Keep</button>
                </div>
              </div>
              <p v-if="cardError[selected.association]" class="error" role="alert">{{ cardError[selected.association] }}</p>
            </template>
            <section v-if="selected.examples.length" class="record-section" aria-labelledby="examples-heading">
              <h3 id="examples-heading" class="section-label">Examples</h3>
              <ul class="examples">
                <li v-for="example in selected.examples" :key="example.annotation" class="example" :class="{ counterexample: example.role === 'COUNTEREXAMPLE' }">
                  <p class="section-label">{{ example.role === 'COUNTEREXAMPLE' ? 'Counterexample' : 'Example' }}</p>
                  <p class="note">{{ example.note }}</p>
                  <p class="meta">{{ example.visibility === 'SHARED' ? 'Shared' : 'Private note' }}</p>
                </li>
              </ul>
            </section>
          </article>
        </template>
      </template>
    </section>
  `,
});
