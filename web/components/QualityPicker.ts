import { computed, defineComponent, onBeforeUnmount, onMounted, ref, type PropType } from "vue/dist/vue.esm-bundler.js";
import { MAX_QUALITIES } from "../../shared/limits.ts";
import { isQuality, qualityGroups } from "../../shared/qualities.ts";

let instances = 0;

/** Up to five toggles for what a person hears in a song. Picking nothing is a valid answer. */
export default defineComponent({
  props: {
    modelValue: { type: Array as PropType<string[]>, required: true },
    disabled: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const root = ref<HTMLFieldSetElement | null>(null);
    const id = `qualities-${instances += 1}`;
    const full = computed(() => props.modelValue.length >= MAX_QUALITIES);
    let touchedTag: HTMLElement | null = null;
    // A quality picked before it left the vocabulary can still be seen and unpicked.
    const groups = computed(() => {
      const earlier = props.modelValue.filter(label => !isQuality(label)).map(label => ({ label, phrase: label, description: "" }));
      return earlier.length ? [...qualityGroups, { name: "Earlier picks", qualities: earlier }] : qualityGroups;
    });

    function toggle(label: string) {
      const picked = props.modelValue.includes(label);
      if (!picked && full.value) return;
      emit("update:modelValue", picked ? props.modelValue.filter(other => other !== label) : [...props.modelValue, label]);
    }

    function positionHelp(event: Event) {
      const option = event.currentTarget as HTMLElement;
      const tip = option.querySelector<HTMLElement>(".quality-tip");
      if (!tip) return;
      const { left, width, top } = option.getBoundingClientRect();
      // Measure the wrapped text before showing it, so it stays inside the viewport.
      tip.style.display = "block";
      const { offsetWidth: tipWidth, offsetHeight: tipHeight } = tip;
      tip.style.removeProperty("display");
      const edge = 8;
      const centered = left + (width - tipWidth) / 2;
      const last = document.documentElement.clientWidth - tipWidth - edge;
      option.style.setProperty("--tip-left", `${Math.max(edge, Math.min(centered, last)) - left}px`);
      option.classList.toggle("tip-below", top < tipHeight + edge);
      option.classList.remove("tip-dismissed");
    }

    function dismissTouchHelp() {
      touchedTag?.classList.remove("tip-touch");
      touchedTag = null;
    }

    function showTouchHelp(event: PointerEvent) {
      if (event.pointerType !== "touch") return;
      positionHelp(event);
      touchedTag = event.currentTarget as HTMLElement;
      touchedTag.classList.add("tip-touch");
    }

    function dismissHelp(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      dismissTouchHelp();
      for (const option of root.value?.querySelectorAll(".quality-option:hover, .quality-option:focus-within") ?? []) {
        option.classList.add("tip-dismissed");
      }
    }
    onMounted(() => {
      document.addEventListener("keydown", dismissHelp);
      document.addEventListener("pointerdown", dismissTouchHelp);
    });
    onBeforeUnmount(() => {
      document.removeEventListener("keydown", dismissHelp);
      document.removeEventListener("pointerdown", dismissTouchHelp);
    });

    return { root, id, full, groups, toggle, positionHelp, showTouchHelp, MAX_QUALITIES };
  },
  template: `
    <fieldset ref="root" class="qualities" :disabled="disabled">
      <legend>
        What do you hear? <span class="optional">optional</span>
        <span class="count" role="status">{{ modelValue.length }} of {{ MAX_QUALITIES }}</span>
      </legend>
      <p class="field-hint quality-hover-hint">Hover over a tag for a more detailed description of what it means.</p>
      <p class="field-hint quality-touch-hint">Tap a tag to select it and see what it means.</p>
      <div v-for="(group, index) in groups" :key="group.name" class="quality-group">
        <p class="section-label" :id="id + '-' + index">{{ group.name }}</p>
        <div class="chips" role="group" :aria-labelledby="id + '-' + index">
          <span v-for="(quality, qualityIndex) in group.qualities" :key="quality.label" class="quality-option"
            @pointerenter="positionHelp" @focusin="positionHelp" @pointerup="showTouchHelp">
            <button class="chip" type="button"
              :aria-pressed="modelValue.includes(quality.label) ? 'true' : 'false'"
              :aria-describedby="quality.description ? id + '-tip-' + index + '-' + qualityIndex : undefined"
              :disabled="full && !modelValue.includes(quality.label)" @click="toggle(quality.label)">{{ quality.label }}</button>
            <span v-if="quality.description" :id="id + '-tip-' + index + '-' + qualityIndex" class="quality-tip" role="tooltip">
              <span>{{ quality.description }}</span>
            </span>
          </span>
        </div>
      </div>
      <p v-if="full" class="field-hint">Five is the most. Unpick one to choose another.</p>
    </fieldset>
  `,
});
