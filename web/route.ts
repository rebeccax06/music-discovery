import { reactive } from "vue/dist/vue.esm-bundler.js";

/**
 * The view the address names: whose wall, and which word on it. Opening a word pushes a history
 * entry, so the browser's Back button closes it.
 */
export const route = reactive({ wall: null as string | null, word: null as string | null, friends: false });

type Target = { wall?: string | null; word?: string | null; friends?: boolean };

function read() {
  const query = new URLSearchParams(location.search);
  route.wall = query.get("wall")?.trim() || null;
  route.word = query.get("word")?.trim().toLowerCase() || null;
  route.friends = query.has("friends");
}

/** How a word appears in an address. Labels arrive from the server already trimmed and collapsed. */
export function wordKey(label: string) {
  return label.toLowerCase();
}

export function address(target: Target) {
  const url = new URL("/", location.origin);
  if (target.friends) url.searchParams.set("friends", "");
  if (target.wall) url.searchParams.set("wall", target.wall);
  if (target.word) url.searchParams.set("word", target.word);
  return url;
}

export function go(target: Target, options: { replace?: boolean } = {}) {
  const url = address(target);
  const path = `${url.pathname}${url.search.replace("friends=", "friends")}`;
  if (path !== `${location.pathname}${location.search}`) {
    if (options.replace) history.replaceState({}, "", path);
    else history.pushState({}, "", path);
  }
  read();
}

read();
window.addEventListener("popstate", read);
