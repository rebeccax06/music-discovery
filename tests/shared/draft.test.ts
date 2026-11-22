import { describe, expect, test } from "bun:test";
import { draft, type DraftExample } from "../../shared/draft.ts";
import { qualities, qualityPhrase } from "../../shared/qualities.ts";

const you = { owner: true } as const;
const example = (...picked: string[]): DraftExample => ({ role: "EXAMPLE", qualities: picked });

describe("The draft description", () => {
  test("says nothing when no qualities were picked", () => {
    expect(draft("Dreamy", [], you)).toBeNull();
    expect(draft("Dreamy", [example(), example()], you)).toBeNull();
    expect(draft("Dreamy", [{ role: "COUNTEREXAMPLE", qualities: ["heavy drums"] }], you)).toBeNull();
  });

  test("names what one song has, and what every song shares, as what the word means", () => {
    expect(draft("Dreamy", [example("soft drums", "airy vocals")], you))
      .toBe("For you, “Dreamy” means airy vocals and soft drums.");
    expect(draft("Dreamy", [example("airy vocals"), example("airy vocals")], you))
      .toBe("For you, “Dreamy” means airy vocals.");
    expect(draft("Late night", [example("warm bass", "slow tempo", "lo-fi texture")], { owner: false, name: "Alex" }))
      .toBe("For Alex, “Late night” means a slow tempo, warm bass and a lo-fi texture.");
  });

  test("separates what most songs share from what only some have", () => {
    expect(draft("Dreamy", [example("airy vocals", "soft drums"), example("airy vocals", "layered synths")], you))
      .toBe("For you, “Dreamy” often means airy vocals, with soft drums or layered synths.");
  });

  test("offers alternatives when no quality is on most songs", () => {
    expect(draft("Hype", [example("driving beat"), example("heavy drums"), example("fast tempo")], you))
      .toBe("For you, “Hype” can mean a driving beat, heavy drums or a fast tempo.");
  });

  test("names at most four qualities, preferring the most common and then vocabulary order", () => {
    const six = ["calm mood", "warm bass", "soft drums", "airy vocals", "slow tempo", "lots of reverb"];
    expect(draft("Calm", [example(...six)], you))
      .toBe("For you, “Calm” means airy vocals, soft drums, a slow tempo and warm bass.");
    expect(draft("Calm", [example(...six), example("calm mood"), example("calm mood", "lots of reverb")], you))
      .toBe("For you, “Calm” often means a calm mood and lots of reverb, with airy vocals or soft drums.");
  });

  test("ignores counterexamples and keeps a quality that is no longer offered", () => {
    const examples = [example("airy vocals", "tape hiss"), { role: "COUNTEREXAMPLE", qualities: ["heavy drums"] }];
    expect(draft("Dreamy", examples, you)).toBe("For you, “Dreamy” means airy vocals and tape hiss.");
  });

  test("for any picks: never names an unpicked quality, is silent only without picks, and ignores the order songs were added", () => {
    let seed = 20261122;
    const random = (below: number) => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return Math.floor((seed / 4294967296) * below);
    };
    const labels = qualities.map(quality => quality.label);

    for (let trial = 0; trial < 500; trial += 1) {
      const examples = Array.from({ length: random(6) }, () => ({
        role: random(5) === 0 ? "COUNTEREXAMPLE" : "EXAMPLE",
        qualities: Array.from({ length: random(6) }, () => labels[random(labels.length)]!),
      }));
      const sentence = draft("Word", examples, you);
      const picked = new Set(examples.filter(entry => entry.role === "EXAMPLE").flatMap(entry => entry.qualities));

      expect(sentence === null).toBe(picked.size === 0);
      if (sentence === null) continue;
      const named = labels.filter(label => sentence.includes(qualityPhrase(label)));
      expect(named.length).toBeGreaterThan(0);
      expect(named.length).toBeLessThanOrEqual(4);
      for (const label of named) expect(picked.has(label)).toBe(true);
      expect(draft("Word", examples.toReversed(), you)).toBe(sentence);
    }
  });
});
