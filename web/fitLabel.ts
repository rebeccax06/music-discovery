import type { Directive } from "vue/dist/vue.esm-bundler.js";

const SMALLEST = 0.5;

function fit(el: HTMLElement) {
  el.style.fontSize = "";
  el.classList.remove("is-squeezed");
  const largest = parseFloat(getComputedStyle(el).fontSize);
  const smallest = largest * SMALLEST;
  const overflowing = () => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
  let size = largest;
  while (overflowing() && size > smallest) {
    size = Math.max(smallest, size - 1);
    el.style.fontSize = `${size}px`;
  }
  if (overflowing()) el.classList.add("is-squeezed");
}

export const fitLabel: Directive<HTMLElement, string> = {
  mounted(el) {
    fit(el);
    void document.fonts?.ready.then(() => fit(el));
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) fit(el);
  },
};
