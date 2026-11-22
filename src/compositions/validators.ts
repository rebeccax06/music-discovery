import type { EndpointValidator } from "@mit-sdg/sync-engine/boundary";
import { findTrack } from "../../shared/catalog.ts";
import { MAX_NOTE, MAX_QUALITIES } from "../../shared/limits.ts";
import { isQuality } from "../../shared/qualities.ts";

type Input = Record<string, unknown>;

function record(value: unknown): value is Input {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Accepts an object with exactly `keys` that also satisfies `accepts`. */
export function validator(keys: readonly string[], accepts: (value: Input) => boolean, detail: string): EndpointValidator {
  return (value) => {
    const exact = record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
    return exact && accepts(value) ? { ok: true } : { ok: false, detail };
  };
}

/** The cookie policy supplies the session, or null when the request carries no cookie. */
export function session(value: Input) {
  return typeof value.session === "string" || value.session === null;
}

export function boundedText(value: unknown, max: number) {
  return typeof value === "string" && value.length <= max;
}

/** An identity issued by a concept. Bounding it keeps oversized text out of queries. */
export function identity(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 64;
}

export function username(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 64;
}

export function catalogTrack(value: unknown) {
  return typeof value === "string" && findTrack(value) !== null;
}

export function note(value: unknown) {
  return boundedText(value, MAX_NOTE);
}

/** At most five distinct qualities, each one from the offered vocabulary. */
export function pickedQualities(value: unknown) {
  return Array.isArray(value)
    && value.length <= MAX_QUALITIES
    && new Set(value).size === value.length
    && value.every(quality => typeof quality === "string" && isQuality(quality));
}
