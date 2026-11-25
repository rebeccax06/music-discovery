import { api } from "./api.ts";

const returnKey = "sound-it-out-commons-return";

export async function continueWithCommons() {
  const result = await api.auth.commons.start({});
  if ("error" in result) return "Could not start Commons sign-in. Try again.";
  try {
    sessionStorage.setItem(returnKey, location.search);
  } catch {
    // The callback can still return to the home page when browser storage is unavailable.
  }
  location.assign(result.address);
}

export function commonsReturnAddress() {
  const target = new URL("/", location.origin);
  try {
    target.search = sessionStorage.getItem(returnKey) ?? "";
  } catch {
    // The destination stays on this app's home page.
  }
  return target.href;
}

export function leaveCommonsCallback(target: string) {
  try {
    sessionStorage.removeItem(returnKey);
  } catch {
    // Navigation can continue without browser storage.
  }
  location.replace(target);
}
