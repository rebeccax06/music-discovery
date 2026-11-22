import { onBeforeUnmount, type Ref } from "vue/dist/vue.esm-bundler.js";

/** Asks the browser to confirm leaving the page while `dirty` holds text that has not been saved. */
export function warnBeforeLeaving(dirty: Ref<boolean>) {
  const warn = (event: BeforeUnloadEvent) => { if (dirty.value) event.preventDefault(); };
  window.addEventListener("beforeunload", warn);
  onBeforeUnmount(() => window.removeEventListener("beforeunload", warn));
}
