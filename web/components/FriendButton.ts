import { computed, defineComponent, ref, type PropType } from "vue/dist/vue.esm-bundler.js";
import type { Friends } from "../friends.ts";
import { notify } from "../toast.ts";

/** Where you stand with the owner of the wall you are looking at, and the one next step from there. */
export default defineComponent({
  props: {
    me: { type: String, required: true },
    username: { type: String, required: true },
    friends: { type: Object as PropType<Friends>, required: true },
  },
  setup(props) {
    const pending = ref(false);
    const error = ref("");
    const standing = computed(() => props.friends.standing(props.me, props.username));

    async function run(action: (username: string) => Promise<string | undefined>, done: string) {
      if (pending.value) return;
      pending.value = true;
      error.value = "";
      const failure = await action(props.username);
      pending.value = false;
      if (failure) error.value = failure;
      else notify(done);
    }

    return { pending, error, standing, run };
  },
  template: `
    <div v-if="friends.loaded.value && standing !== 'self'" class="friend-standing">
      <p v-if="standing === 'friend'" class="meta"><span aria-hidden="true">✓ </span>You and {{ username }} are friends. You can see the words {{ username }} shares with friends.</p>
      <template v-else-if="standing === 'sent'">
        <p class="meta">Friend request sent. When {{ username }} accepts, you’ll see the words they share with friends.</p>
        <button class="text-button" type="button" :disabled="pending" @click="run(friends.cancel, 'Request cancelled')">Cancel request</button>
      </template>
      <template v-else-if="standing === 'received'">
        <p class="meta">{{ username }} asked to be your friend.</p>
        <div class="form-actions">
          <button class="primary" type="button" :disabled="pending" @click="run(friends.accept, 'You and ' + username + ' are now friends')">Accept</button>
          <button class="action" type="button" :disabled="pending" @click="run(friends.decline, 'Request declined')">Decline</button>
        </div>
      </template>
      <template v-else>
        <button class="action add-friend" type="button" :disabled="pending" @click="run(friends.request, 'Friend request sent to ' + username)">
          {{ pending ? 'Sending…' : 'Add ' + username + ' as a friend' }}
        </button>
        <p class="field-hint">Friends can see the words {{ username }} shares only with friends.</p>
      </template>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </div>
  `,
});
