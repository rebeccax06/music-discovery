/**
 * The qualities a listener can pick for a song.
 *
 * `label` is what a chip shows and what is stored. `phrase` is how the quality reads after
 * "means" in a draft description, so every phrase is a noun phrase.
 */
export type Quality = { label: string; phrase: string };

export const qualityGroups: ReadonlyArray<{ name: string; qualities: readonly Quality[] }> = [
  {
    name: "Vocals",
    qualities: [
      { label: "airy vocals", phrase: "airy vocals" },
      { label: "close vocals", phrase: "close vocals" },
      { label: "soft vocals", phrase: "soft vocals" },
      { label: "powerful vocals", phrase: "powerful vocals" },
      { label: "no vocals", phrase: "no vocals" },
    ],
  },
  {
    name: "Rhythm",
    qualities: [
      { label: "driving beat", phrase: "a driving beat" },
      { label: "soft drums", phrase: "soft drums" },
      { label: "heavy drums", phrase: "heavy drums" },
      { label: "slow tempo", phrase: "a slow tempo" },
      { label: "fast tempo", phrase: "a fast tempo" },
      { label: "steady groove", phrase: "a steady groove" },
    ],
  },
  {
    name: "Sound",
    qualities: [
      { label: "layered synths", phrase: "layered synths" },
      { label: "warm bass", phrase: "warm bass" },
      { label: "bright guitars", phrase: "bright guitars" },
      { label: "acoustic instruments", phrase: "acoustic instruments" },
      { label: "distorted guitars", phrase: "distorted guitars" },
      { label: "lo-fi texture", phrase: "a lo-fi texture" },
    ],
  },
  {
    name: "Feel",
    qualities: [
      { label: "lots of reverb", phrase: "lots of reverb" },
      { label: "sparse arrangement", phrase: "a sparse arrangement" },
      { label: "dense layers", phrase: "dense layers" },
      { label: "gradual build", phrase: "a gradual build" },
      { label: "calm mood", phrase: "a calm mood" },
      { label: "tense mood", phrase: "a tense mood" },
      { label: "uplifting mood", phrase: "an uplifting mood" },
    ],
  },
];

export const qualities: readonly Quality[] = qualityGroups.flatMap(group => group.qualities);

const order = new Map(qualities.map((quality, index) => [quality.label, index]));
const phrases = new Map(qualities.map(quality => [quality.label, quality.phrase]));

export function isQuality(label: string) {
  return order.has(label);
}

/** Position in the vocabulary. A quality no longer offered sorts after every offered one. */
export function qualityOrder(label: string) {
  return order.get(label) ?? qualities.length;
}

/** How a stored quality reads in a sentence. A quality no longer offered reads as it was stored. */
export function qualityPhrase(label: string) {
  return phrases.get(label) ?? label;
}
