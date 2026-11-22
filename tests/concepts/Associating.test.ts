import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  AssociatingConcept,
  AssociationExists,
  InvalidAssociation,
  NotOwner,
  UnknownAssociation,
} from "../../src/concepts/Associating.ts";
import { isolatedDatabase } from "../support/mongo.ts";

describe("Associating", () => {
  let storage: Awaited<ReturnType<typeof isolatedDatabase>>;
  let concept: AssociatingConcept;

  beforeAll(async () => {
    storage = await isolatedDatabase();
    concept = new AssociatingConcept(storage.db);
  });
  afterAll(async () => {
    await storage?.close();
  });

  test("two people keep independent definitions, and editing preserves identity", async () => {
    const alex = await concept.associate({
      user: "alex",
      label: "  Hype  ",
      description: "  Driving percussion without overpowering vocals.  ",
      visibility: "PRIVATE",
    });
    const daniel = await concept.associate({
      user: "daniel",
      label: "hype",
      description: "Fast electronic dance music.",
      visibility: "PUBLIC",
    });
    expect(daniel.association).not.toBe(alex.association);
    expect(await concept._byUser({ user: "alex" })).toEqual([
      {
        ...alex,
        label: "Hype",
        description: "Driving percussion without overpowering vocals.",
        visibility: "PRIVATE",
      },
    ]);

    await concept.update({
      user: "alex",
      ...alex,
      label: "Hype",
      description: " Fast drums, vocals in the background. ",
    });
    await concept.setVisibility({
      user: "alex",
      ...alex,
      visibility: "PUBLIC",
    });
    expect(await concept._get(alex)).toEqual([
      {
        user: "alex",
        label: "Hype",
        description: "Fast drums, vocals in the background.",
        visibility: "PUBLIC",
      },
    ]);
    expect((await concept._get(daniel))[0]).toMatchObject({
      user: "daniel",
      description: "Fast electronic dance music.",
      visibility: "PUBLIC",
    });

    await concept.remove({ user: "alex", ...alex });
    expect(await concept._get(alex)).toEqual([]);
    expect((await concept._byUser({ user: "daniel" }))[0]!.association).toBe(
      daniel.association,
    );
    const recreated = await concept.associate({
      user: "alex",
      label: "Hype",
      description: "A new meaning.",
      visibility: "PRIVATE",
    });
    expect(recreated.association).not.toBe(alex.association);
  });

  test("accepts a word with no description, lets its owner write one and clear it, and stores a limited audience", async () => {
    const { association } = await concept.associate({
      user: "mira",
      label: "Dreamy",
      description: "  ",
      visibility: "PRIVATE",
    });
    expect(await concept._get({ association })).toEqual([
      { user: "mira", label: "Dreamy", description: "", visibility: "PRIVATE" },
    ]);
    await concept.update({ user: "mira", association, label: "Dreamy", description: " Far-away vocals. " });
    expect((await concept._get({ association }))[0]!.description).toBe("Far-away vocals.");
    await concept.setVisibility({ user: "mira", association, visibility: "LIMITED" });
    expect((await concept._get({ association }))[0]!.visibility).toBe("LIMITED");
    await concept.setVisibility({ user: "mira", association, visibility: "PRIVATE" });
    await concept.update({ user: "mira", association, label: "Dreamy", description: "" });
    expect(await concept._byUser({ user: "mira" })).toEqual([
      { association, label: "Dreamy", description: "", visibility: "PRIVATE" },
    ]);
  });

  test("refuses an empty word and leaves another person's definition unchanged", async () => {
    const input = {
      user: "alex",
      label: "dreamy",
      description: "Airy vocals and layered synths.",
      visibility: "PRIVATE" as const,
    };
    await expect(
      concept.associate({ ...input, label: " \n\t " }),
    ).rejects.toBeInstanceOf(InvalidAssociation);
    const { association } = await concept.associate(input);

    const stranger = { user: "daniel", association };
    await expect(
      concept.update({
        ...stranger,
        label: "dreamy",
        description: "A different meaning.",
      }),
    ).rejects.toBeInstanceOf(NotOwner);
    await expect(
      concept.setVisibility({ ...stranger, visibility: "PUBLIC" }),
    ).rejects.toBeInstanceOf(NotOwner);
    await expect(concept.remove(stranger)).rejects.toBeInstanceOf(NotOwner);
    await expect(
      concept.update({
        user: input.user,
        association,
        label: " ",
        description: "Still airy.",
      }),
    ).rejects.toBeInstanceOf(InvalidAssociation);
    await expect(
      concept.update({
        user: input.user,
        association: "missing",
        label: "dreamy",
        description: "Still airy.",
      }),
    ).rejects.toBeInstanceOf(UnknownAssociation);
    expect(await concept._get({ association })).toEqual([
      {
        user: "alex",
        label: "dreamy",
        description: input.description,
        visibility: "PRIVATE",
      },
    ]);
  });

  test("treats spacing and capitalization as the same word for one person", async () => {
    const first = await concept.associate({
      user: "alex",
      label: "  Dreamy   Beat ",
      description: "Soft drums.",
      visibility: "PRIVATE",
    });
    await expect(
      concept.associate({
        user: "alex",
        label: "dreamy beat",
        description: "Another description.",
        visibility: "PUBLIC",
      }),
    ).rejects.toBeInstanceOf(AssociationExists);
    expect((await concept._get(first))[0]!.label).toBe("Dreamy Beat");
    expect(await concept._byUser({ user: "alex" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Dreamy Beat" }),
        expect.objectContaining({ label: "Hype" }),
        expect.objectContaining({ label: "dreamy" }),
      ]),
    );
  });

  test("renames a word without changing its identity, but not onto another of the same person's words", async () => {
    const { association } = await concept.associate({
      user: "sam",
      label: "chill",
      description: "Slow and warm.",
      visibility: "PRIVATE",
    });
    await concept.associate({
      user: "sam",
      label: "mellow",
      description: "Soft edges.",
      visibility: "PRIVATE",
    });

    await expect(
      concept.update({
        user: "sam",
        association,
        label: " MELLOW ",
        description: "Slow and warm.",
      }),
    ).rejects.toBeInstanceOf(AssociationExists);
    await concept.update({
      user: "sam",
      association,
      label: " Laid   Back ",
      description: "Slow and warm.",
    });
    await concept.update({
      user: "sam",
      association,
      label: "laid back",
      description: "Slow and warm.",
    });
    expect(await concept._get({ association })).toEqual([
      {
        user: "sam",
        label: "laid back",
        description: "Slow and warm.",
        visibility: "PRIVATE",
      },
    ]);
    await expect(
      concept.associate({
        user: "sam",
        label: "Laid Back",
        description: "Again.",
        visibility: "PRIVATE",
      }),
    ).rejects.toBeInstanceOf(AssociationExists);
    await concept.associate({
      user: "sam",
      label: "chill",
      description: "Free again.",
      visibility: "PRIVATE",
    });
  });

  test("allows one definition when two creates of the same word race", async () => {
    const input = {
      user: "alex",
      label: "focus",
      description: "A steady pulse.",
      visibility: "PRIVATE" as const,
    };
    const results = await Promise.allSettled([
      concept.associate(input),
      new AssociatingConcept(storage.db).associate({
        ...input,
        description: "No distractions.",
      }),
    ]);
    const succeeded = results.filter((result) => result.status === "fulfilled");
    const refused = results.filter((result) => result.status === "rejected");
    expect(succeeded).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0]!.reason).toBeInstanceOf(AssociationExists);
    const kept = (await concept._byUser({ user: "alex" })).filter(
      (word) => word.label === "focus",
    );
    expect(kept).toHaveLength(1);
    expect(kept[0]!.association).toBe(succeeded[0]!.value.association);
  });
});
