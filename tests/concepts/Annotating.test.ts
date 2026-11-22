import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { AnnotatingConcept, AnnotationExists, NotAuthor, UnknownAnnotation } from "../../src/concepts/Annotating.ts";
import { isolatedDatabase } from "../support/mongo.ts";

describe("Annotating", () => {
  let storage: Awaited<ReturnType<typeof isolatedDatabase>>;
  let concept: AnnotatingConcept;

  beforeAll(async () => {
    storage = await isolatedDatabase();
    concept = new AnnotatingConcept(storage.db);
  });
  afterAll(async () => { await storage?.close(); });

  test("an example with picked qualities and no note starts private and keeps its identity and visibility when edited", async () => {
    const context = "hype";
    const author = "alex";
    const item = "percussion track";
    const { annotation } = await concept.annotate({
      author, item, context, role: "EXAMPLE", note: "", qualities: ["heavy drums", "driving beat"],
    });
    expect(await concept._forContext({ context })).toEqual([
      { annotation, author, item, role: "EXAMPLE", note: "", qualities: ["driving beat", "heavy drums"], visibility: "PRIVATE" },
    ]);

    await concept.setVisibility({ author, annotation, visibility: "SHARED" });
    await concept.update({
      author, annotation, role: "COUNTEREXAMPLE", note: " The vocals overpower the drums. ", qualities: ["powerful vocals"],
    });
    expect(await concept._get({ annotation })).toEqual([{
      author, item, context, role: "COUNTEREXAMPLE", note: "The vocals overpower the drums.",
      qualities: ["powerful vocals"], visibility: "SHARED",
    }]);
    expect((await concept._forContext({ context }))[0]!.annotation).toBe(annotation);

    await concept.setVisibility({ author, annotation, visibility: "PRIVATE" });
    expect((await concept._get({ annotation }))[0]!.visibility).toBe("PRIVATE");
    await concept.remove({ author, annotation });
    expect(await concept._get({ annotation })).toEqual([]);
    await expect(concept.remove({ author, annotation })).rejects.toBeInstanceOf(UnknownAnnotation);
  });

  test("stores qualities trimmed, lowercased, without repeats or blanks, and in a stable order", async () => {
    const input = { context: "warmth", item: "bass track", author: "alex", role: "EXAMPLE" as const };
    const { annotation } = await concept.annotate({
      ...input, note: "  ", qualities: [" Warm Bass ", "soft drums", "warm bass", "   ", "SOFT DRUMS"],
    });
    expect(await concept._get({ annotation })).toEqual([
      { ...input, note: "", qualities: ["soft drums", "warm bass"], visibility: "PRIVATE" },
    ]);

    await concept.update({ author: input.author, annotation, role: "EXAMPLE", note: "", qualities: [] });
    expect((await concept._get({ annotation }))[0]).toMatchObject({ note: "", qualities: [] });
  });

  test("refuses changes by a different author without modifying the note or the qualities", async () => {
    const input = { context: "dreamy", item: "synth track", author: "alex", role: "EXAMPLE" as const };
    const { annotation } = await concept.annotate({ ...input, note: "The synths are airy.", qualities: ["layered synths"] });

    const otherAuthor = { author: "daniel", annotation };
    await expect(concept.update({ ...otherAuthor, role: "COUNTEREXAMPLE", note: "Different meaning", qualities: ["heavy drums"] }))
      .rejects.toBeInstanceOf(NotAuthor);
    await expect(concept.setVisibility({ ...otherAuthor, visibility: "SHARED" })).rejects.toBeInstanceOf(NotAuthor);
    await expect(concept.remove(otherAuthor)).rejects.toBeInstanceOf(NotAuthor);
    await expect(concept.update({ author: "alex", annotation: "missing", role: "EXAMPLE", note: "", qualities: [] }))
      .rejects.toBeInstanceOf(UnknownAnnotation);
    expect(await concept._get({ annotation })).toEqual([
      { ...input, note: "The synths are airy.", qualities: ["layered synths"], visibility: "PRIVATE" },
    ]);
  });

  test("allows one annotation per context and item even when two adds race", async () => {
    const input = { context: "focus", item: "same track", author: "alex", role: "EXAMPLE" as const, qualities: [] };
    const results = await Promise.allSettled([
      concept.annotate({ ...input, note: "The chords repeat without distraction." }),
      new AnnotatingConcept(storage.db).annotate({ ...input, note: "The tempo is steady." }),
    ]);
    const succeeded = results.filter(result => result.status === "fulfilled");
    const refused = results.filter(result => result.status === "rejected");
    expect(succeeded).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0]!.reason).toBeInstanceOf(AnnotationExists);
    const kept = await concept._forContext({ context: input.context });
    expect(kept).toHaveLength(1);
    expect(kept[0]!.annotation).toBe(succeeded[0]!.value.annotation);
  });

  test("clearing a context preserves annotations of the same item in another context", async () => {
    const first = {
      context: "warm", item: "guitar track", author: "alex", role: "EXAMPLE" as const, note: "Rounded guitar tone.", qualities: [],
    };
    const one = await concept.annotate(first);
    const two = await concept.annotate({ ...first, item: "bass track", note: "Soft bass." });
    const independent = await concept.annotate({ ...first, context: "bright", author: "daniel", note: "The high notes ring out." });
    await concept.clearContext({ context: first.context });
    await concept.clearContext({ context: first.context });

    expect(await concept._get(one)).toEqual([]);
    expect(await concept._get(two)).toEqual([]);
    expect(await concept._forContext({ context: first.context })).toEqual([]);
    expect((await concept._get(independent))[0]!.note).toBe("The high notes ring out.");
    expect((await concept.annotate(first)).annotation).not.toBe(one.annotation);
  });
});
