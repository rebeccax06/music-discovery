import { computed, defineComponent, nextTick, ref, type PropType } from "vue/dist/vue.esm-bundler.js";
import { catalog } from "../../shared/catalog.ts";
import { MAX_NOTE } from "../../shared/limits.ts";
import type { Failure } from "../types.ts";
import { warnBeforeLeaving } from "../unsaved.ts";
import QualityPicker from "./QualityPicker.ts";
import TrackPlayer from "./TrackPlayer.ts";

const FILTER_FROM = 9;
let instances = 0;

/**
 * Choosing a song and saying what you hear in it. Adding an example, sending a suggestion, and
 * adding a matched suggestion all use this, so the three behave alike. A failed submit keeps
 * everything the person picked and wrote.
 */
export default defineComponent({
  components: { QualityPicker, TrackPlayer },
  props: {
    heading: { type: String, required: true },
    commit: { type: String, required: true },
    committing: { type: String, required: true },
    /** Tracks that cannot be chosen, with the reason shown in place of the button. */
    taken: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
    /** When set, the song is already decided and only what is heard in it is asked. */
    only: { type: String as PropType<string | null>, default: null },
    withQualities: { type: Boolean, default: true },
    noteLabel: { type: String, default: "Anything else?" },
    submit: { type: Function as PropType<(track: string, qualities: string[], note: string) => Promise<Failure>>, required: true },
  },
  emits: ["close"],
  setup(props, { emit }) {
    const id = `picker-${instances += 1}`;
    const query = ref("");
    const chosen = ref<string | null>(props.only);
    const picked = ref<string[]>([]);
    const note = ref("");
    const pending = ref(false);
    const error = ref("");
    const root = ref<HTMLElement | null>(null);
    const showFilter = computed(() => !props.only && catalog.length >= FILTER_FROM);
    const tracks = computed(() => {
      if (props.only) return catalog.filter(entry => entry.track === props.only);
      const wanted = query.value.trim().toLowerCase();
      return wanted
        ? catalog.filter(entry => `${entry.title} ${entry.artist}`.toLowerCase().includes(wanted))
        : catalog;
    });
    const dirty = computed(() => !!note.value.trim() || picked.value.length > 0);
    warnBeforeLeaving(dirty);

    async function choose(track: string) {
      chosen.value = track;
      error.value = "";
      await nextTick();
      root.value?.querySelector<HTMLElement>(".song-form .chip, .song-form textarea")?.focus();
    }

    function unchoose() {
      chosen.value = null;
      picked.value = [];
      note.value = "";
      error.value = "";
    }

    async function send() {
      if (pending.value || !chosen.value) return;
      pending.value = true;
      error.value = "";
      const failure = await props.submit(chosen.value, picked.value, note.value.trim());
      pending.value = false;
      if (failure) {
        error.value = failure;
        return;
      }
      picked.value = [];
      note.value = "";
      if (props.only) emit("close");
      else chosen.value = null;
    }

    return { id, query, chosen, picked, note, pending, error, root, showFilter, tracks, choose, unchoose, send, MAX_NOTE };
  },
  template: `
    <section ref="root" class="picker" :aria-labelledby="id">
      <div class="picker-head">
        <h3 :id="id">{{ heading }}</h3>
        <button class="action" type="button" :disabled="pending" @click="$emit('close')">Done</button>
      </div>
      <p v-if="!only" class="meta">A small library of tracks we have checked, not all of SoundCloud.</p>
      <input v-if="showFilter" v-model="query" class="search" type="search" placeholder="Find a track or artist"
        aria-label="Find a track or artist" autocomplete="off">
      <p v-if="!tracks.length" class="meta" role="status">No tracks match “{{ query.trim() }}”.</p>
      <ul class="songs">
        <li v-for="entry in tracks" :key="entry.track" class="song" :class="{ 'is-chosen': chosen === entry.track }">
          <TrackPlayer :track="entry.track">
            <span v-if="taken[entry.track]" class="audience">{{ taken[entry.track] }}</span>
            <button v-else-if="chosen !== entry.track" class="action choose" type="button" :disabled="pending" @click="choose(entry.track)">
              Choose<span class="visually-hidden"> {{ entry.title }}</span>
            </button>
          </TrackPlayer>
          <form v-if="chosen === entry.track" class="song-form" @submit.prevent="send" :aria-busy="pending">
            <QualityPicker v-if="withQualities" v-model="picked" :disabled="pending" />
            <div class="field">
              <label :for="id + '-note'">{{ noteLabel }} <span class="optional">optional</span></label>
              <textarea :id="id + '-note'" v-model="note" :maxlength="MAX_NOTE" rows="2" :readonly="pending"></textarea>
            </div>
            <p v-if="error" class="error" role="alert">{{ error }}</p>
            <div class="form-actions">
              <button class="primary" :disabled="pending">{{ pending ? committing : commit }}</button>
              <button v-if="!only" class="action" type="button" :disabled="pending" @click="unchoose">Choose a different song</button>
            </div>
          </form>
        </li>
      </ul>
    </section>
  `,
});
