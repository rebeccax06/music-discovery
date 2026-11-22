import { computed, defineComponent, type PropType } from "vue/dist/vue.esm-bundler.js";
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
    const id = `qualities-${instances += 1}`;
    const full = computed(() => props.modelValue.length >= MAX_QUALITIES);
    // A quality picked before it left the vocabulary can still be seen and unpicked.
    const groups = computed(() => {
      const earlier = props.modelValue.filter(label => !isQuality(label)).map(label => ({ label, phrase: label }));
      return earlier.length ? [...qualityGroups, { name: "Earlier picks", qualities: earlier }] : qualityGroups;
    });

    function toggle(label: string) {
      const picked = props.modelValue.includes(label);
      if (!picked && full.value) return;
      emit("update:modelValue", picked ? props.modelValue.filter(other => other !== label) : [...props.modelValue, label]);
    }

    return { id, full, groups, toggle, MAX_QUALITIES };
  },
  template: `
    <fieldset class="qualities" :disabled="disabled">
      <legend>
        What do you hear? <span class="optional">optional</span>
        <span class="count" role="status">{{ modelValue.length }} of {{ MAX_QUALITIES }}</span>
      </legend>
      <div v-for="(group, index) in groups" :key="group.name" class="quality-group">
        <p class="section-label" :id="id + '-' + index">{{ group.name }}</p>
        <div class="chips" role="group" :aria-labelledby="id + '-' + index">
          <button v-for="quality in group.qualities" :key="quality.label" class="chip" type="button"
            :aria-pressed="modelValue.includes(quality.label) ? 'true' : 'false'"
            :disabled="full && !modelValue.includes(quality.label)"
            @click="toggle(quality.label)">{{ quality.label }}</button>
        </div>
      </div>
      <p v-if="full" class="field-hint">Five is the most. Unpick one to choose another.</p>
    </fieldset>
  `,
});
