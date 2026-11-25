/**
 * The qualities a listener can pick for a song.
 *
 * `label` is what a chip shows and what is stored. `phrase` is how the quality reads after
 * "means" in a draft description. `description` explains what to listen for when choosing it.
 */
export type Quality = { label: string; phrase: string; description: string };

export const qualityGroups: ReadonlyArray<{ name: string; qualities: readonly Quality[] }> = [
  {
    name: "Vocals",
    qualities: [
      { label: "airy vocals", phrase: "airy vocals", description: "Light or breathy singing, with air audible around the words." },
      { label: "close vocals", phrase: "close vocals", description: "The singer sounds right beside you, with breaths and small details easy to hear." },
      { label: "soft vocals", phrase: "soft vocals", description: "Quiet or gentle singing that blends into the music." },
      { label: "powerful vocals", phrase: "powerful vocals", description: "Strong singing that stands out above the instruments." },
      { label: "no vocals", phrase: "no vocals", description: "There is no singing or spoken voice." },
    ],
  },
  {
    name: "Rhythm",
    qualities: [
      { label: "driving beat", phrase: "a driving beat", description: "A strong pulse that keeps pushing the song forward." },
      { label: "soft drums", phrase: "soft drums", description: "Gentle drum hits that sit behind the other sounds." },
      { label: "heavy drums", phrase: "heavy drums", description: "Hard-hitting or deep drum sounds that stand out." },
      { label: "slow tempo", phrase: "a slow tempo", description: "The main beat moves at an unhurried pace." },
      { label: "fast tempo", phrase: "a fast tempo", description: "The main beats come close together and feel quick." },
      { label: "steady groove", phrase: "a steady groove", description: "A repeating rhythm you can keep moving or tapping to." },
    ],
  },
  {
    name: "Sound",
    qualities: [
      { label: "layered synths", phrase: "layered synths", description: "Several electronic tones play over one another." },
      { label: "warm bass", phrase: "warm bass", description: "Low notes have a rounded, mellow sound." },
      { label: "bright guitars", phrase: "bright guitars", description: "Guitar notes have a clear, ringing edge." },
      { label: "acoustic instruments", phrase: "acoustic instruments", description: "You hear instruments such as an acoustic guitar, piano, or strings." },
      { label: "distorted guitars", phrase: "distorted guitars", description: "The guitars sound fuzzy, gritty, or crunchy." },
      { label: "lo-fi texture", phrase: "a lo-fi texture", description: "The recording sounds grainy, muffled, or crackly, like an old tape." },
    ],
  },
  {
    name: "Feel",
    qualities: [
      { label: "lots of reverb", phrase: "lots of reverb", description: "Sounds linger as if they were played in a large room." },
      { label: "sparse arrangement", phrase: "a sparse arrangement", description: "Only a few sounds play at once, with space between them." },
      { label: "dense layers", phrase: "dense layers", description: "Many sounds play together and fill the space." },
      { label: "gradual build", phrase: "a gradual build", description: "The song slowly adds sounds or gains intensity." },
      { label: "calm mood", phrase: "a calm mood", description: "The overall sound feels relaxed or peaceful." },
      { label: "tense mood", phrase: "a tense mood", description: "The music creates unease or a feeling that something is about to happen." },
      { label: "uplifting mood", phrase: "an uplifting mood", description: "The overall sound feels hopeful or energizing." },
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
