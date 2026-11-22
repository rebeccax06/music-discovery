import { reactive } from "vue/dist/vue.esm-bundler.js";

type Follow = { label: string; run: () => void };

/** One short confirmation at a time, optionally with the next step the person is likely to want. */
export const toast = reactive({ message: "", follow: null as Follow | null });

let timer: ReturnType<typeof setTimeout> | undefined;

export function notify(message: string, follow: Follow | null = null) {
  clearTimeout(timer);
  toast.message = message;
  toast.follow = follow;
  timer = setTimeout(dismiss, follow ? 7000 : 2800);
}

export function dismiss() {
  clearTimeout(timer);
  toast.message = "";
  toast.follow = null;
}
