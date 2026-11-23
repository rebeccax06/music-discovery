import { computed, defineComponent, nextTick, onBeforeUnmount, ref } from "vue/dist/vue.esm-bundler.js";
import { findTrack, playerUrl } from "../../shared/catalog.ts";

/** The part of SoundCloud's Widget API this component uses. */
type Widget = { bind(event: string, listener: () => void): void };
type WidgetApi = {
  Widget: ((frame: HTMLIFrameElement) => Widget) & { Events: { READY: string; ERROR: string; PLAY_PROGRESS: string } };
};

const READY_WITHIN_MS = 10_000;
/**
 * Sound normally starts about 1.3 s after the player is ready (design/verification/tracks.md). A ready
 * player that has not advanced by this point has stalled, as one run of the playback check saw.
 */
const SOUND_WITHIN_MS = 8_000;
let widgetApi: Promise<WidgetApi> | undefined;

function loadWidgetApi() {
  widgetApi ??= new Promise<WidgetApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.onload = () => resolve((window as unknown as { SC: WidgetApi }).SC);
    script.onerror = () => {
      widgetApi = undefined;
      reject(new Error("The SoundCloud player script did not load."));
    };
    document.head.append(script);
  });
  return widgetApi;
}

/**
 * One catalog track: its title, artist, and source, and SoundCloud's embedded player once the person
 * presses play. This is the only component that knows the music comes from SoundCloud.
 */
export default defineComponent({
  props: {
    track: { type: String, required: true },
    /** False when a heading above already names the artist, as in the song library. */
    showArtist: { type: Boolean, default: true },
  },
  setup(props) {
    const entry = computed(() => findTrack(props.track));
    const state = ref<"idle" | "loading" | "ready" | "failed">("idle");
    const frame = ref<HTMLIFrameElement | null>(null);
    const address = computed(() => entry.value ? playerUrl(entry.value) : "");
    const stalled = ref(false);
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let quiet: ReturnType<typeof setTimeout> | undefined;

    async function start() {
      state.value = "loading";
      deadline = setTimeout(() => { if (state.value === "loading") state.value = "failed"; }, READY_WITHIN_MS);
      await nextTick();
      try {
        const api = await loadWidgetApi();
        if (!frame.value) return;
        const widget = api.Widget(frame.value);
        widget.bind(api.Widget.Events.READY, () => {
          state.value = "ready";
          quiet = setTimeout(() => { stalled.value = true; }, SOUND_WITHIN_MS);
        });
        widget.bind(api.Widget.Events.PLAY_PROGRESS, () => {
          clearTimeout(quiet);
          stalled.value = false;
        });
        widget.bind(api.Widget.Events.ERROR, () => { state.value = "failed"; });
      } catch {
        // Without the script the frame may still play, but nothing can confirm it. Offer the source.
        state.value = "failed";
      }
    }

    onBeforeUnmount(() => {
      clearTimeout(deadline);
      clearTimeout(quiet);
    });
    return { entry, state, stalled, frame, address, start };
  },
  template: `
    <div class="track" :data-track="track" :data-player="state">
      <div class="track-line">
        <button v-if="entry && state === 'idle'" class="play" type="button"
          :aria-label="'Play ' + entry.title + ' by ' + entry.artist" @click="start">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <span v-else class="play is-spent" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M9 4v10.2A3.2 3.2 0 1 0 11 17V8h6V4z"/></svg>
        </span>
        <div class="track-names">
          <p class="track-title">{{ entry ? entry.title : 'This track is no longer available' }}</p>
          <p v-if="entry" class="track-artist">
            <template v-if="showArtist">{{ entry.artist }} · </template>
            <a :href="entry.page" target="_blank" rel="noopener">SoundCloud<span class="visually-hidden"> page for {{ entry.title }}, opens in a new tab</span></a>
          </p>
          <p v-else class="track-artist">It was removed from the library. What you saved about it is still here.</p>
        </div>
        <slot></slot>
      </div>
      <template v-if="entry && state !== 'idle'">
        <iframe v-show="state !== 'failed'" ref="frame" class="player-frame" :title="'SoundCloud player: ' + entry.title + ' by ' + entry.artist"
          :src="address" allow="autoplay" scrolling="no"></iframe>
        <p v-if="state === 'loading'" class="meta" role="status">Loading the player…</p>
        <p v-if="state === 'ready' && stalled" class="meta" role="status">
          Not playing? Press play in the player, or
          <a :href="entry.page" target="_blank" rel="noopener">open it on SoundCloud</a>.
        </p>
        <p v-if="state === 'failed'" class="meta" role="status">
          This track isn’t loading here.
          <a :href="entry.page" target="_blank" rel="noopener">Open it on SoundCloud</a>.
        </p>
      </template>
    </div>
  `,
});
