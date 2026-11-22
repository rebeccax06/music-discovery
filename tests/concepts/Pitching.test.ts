import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  AlreadyPitched, AlreadyReviewed, InvalidReview, NotContributor, NotRecipient, PitchingConcept, SelfPitch, UnknownPitch,
} from "../../src/concepts/Pitching.ts";
import { isolatedDatabase } from "../support/mongo.ts";

describe("Pitching", () => {
  let storage: Awaited<ReturnType<typeof isolatedDatabase>>;
  let concept: PitchingConcept;

  beforeAll(async () => {
    storage = await isolatedDatabase();
    concept = new PitchingConcept(storage.db);
  });
  afterAll(async () => { await storage?.close(); });

  test("a pitch stays pending until its recipient reviews it, and the review can be revised without the contributor seeing it", async () => {
    const proposal = { contributor: "daniel", recipient: "alex", target: "alex's hype", item: "drum track" };
    const { pitch } = await concept.pitch({ ...proposal, note: "  The drums made me think of you.  " });
    expect(await concept._get({ pitch })).toEqual([
      { ...proposal, note: "The drums made me think of you.", fit: "PENDING", response: "" },
    ]);
    expect(await concept._sentBy({ contributor: "daniel" })).toContainEqual(
      { pitch, recipient: "alex", target: proposal.target, item: "drum track", note: "The drums made me think of you.", reviewed: false },
    );
    expect(await concept._sentBy({ contributor: "alex" })).toEqual([]);

    await concept.review({ recipient: "alex", pitch, fit: "PARTIAL", response: " Drums fit, vocals too intense. " });
    expect(await concept._forTarget({ target: proposal.target })).toEqual([{
      pitch, contributor: "daniel", item: "drum track", note: "The drums made me think of you.",
      fit: "PARTIAL", response: "Drums fit, vocals too intense.",
    }]);
    await concept.review({ recipient: "alex", pitch, fit: "MATCH", response: "" });
    expect((await concept._get({ pitch }))[0]).toMatchObject({ fit: "MATCH", response: "" });

    const sent = (await concept._sentBy({ contributor: "daniel" })).filter(row => row.pitch === pitch);
    expect(sent).toEqual([
      { pitch, recipient: "alex", target: proposal.target, item: "drum track", note: "The drums made me think of you.", reviewed: true },
    ]);
    expect(JSON.stringify(sent)).not.toContain("MATCH");
  });

  test("refuses a pitch to oneself and a second pitch of the same item for the same target, even when two race", async () => {
    await expect(concept.pitch({ contributor: "alex", recipient: "alex", target: "own word", item: "track", note: "" }))
      .rejects.toBeInstanceOf(SelfPitch);
    expect(await concept._forTarget({ target: "own word" })).toEqual([]);

    const proposal = { recipient: "alex", target: "alex's dreamy", item: "synth track", note: "" };
    const results = await Promise.allSettled([
      concept.pitch({ ...proposal, contributor: "daniel" }),
      new PitchingConcept(storage.db).pitch({ ...proposal, contributor: "mira" }),
    ]);
    const accepted = results.filter(result => result.status === "fulfilled");
    const refused = results.filter(result => result.status === "rejected");
    expect(accepted).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0]!.reason).toBeInstanceOf(AlreadyPitched);
    expect(await concept._forTarget({ target: proposal.target })).toHaveLength(1);

    const elsewhere = await concept.pitch({ ...proposal, contributor: "daniel", target: "alex's warm" });
    expect((await concept._get(elsewhere))[0]!.target).toBe("alex's warm");
  });

  test("only the recipient can review, with a real fit, and nobody else's attempt changes the pitch", async () => {
    const { pitch } = await concept.pitch({
      contributor: "daniel", recipient: "alex", target: "alex's calm", item: "piano track", note: "Quiet.",
    });
    await expect(concept.review({ recipient: "daniel", pitch, fit: "MATCH", response: "It fits!" }))
      .rejects.toBeInstanceOf(NotRecipient);
    await expect(concept.review({ recipient: "mira", pitch, fit: "MISS", response: "" }))
      .rejects.toBeInstanceOf(NotRecipient);
    await expect(concept.review({ recipient: "alex", pitch, fit: "PENDING", response: "" }))
      .rejects.toBeInstanceOf(InvalidReview);
    await expect(concept.review({ recipient: "alex", pitch: "missing", fit: "MATCH", response: "" }))
      .rejects.toBeInstanceOf(UnknownPitch);
    expect((await concept._get({ pitch }))[0]).toMatchObject({ fit: "PENDING", response: "" });
  });

  test("a contributor can withdraw only their own pitch and only before it is reviewed", async () => {
    const proposal = { contributor: "daniel", recipient: "alex", target: "alex's bright", note: "" };
    const pending = await concept.pitch({ ...proposal, item: "guitar track" });
    await expect(concept.withdraw({ contributor: "mira", ...pending })).rejects.toBeInstanceOf(NotContributor);
    await expect(concept.withdraw({ contributor: "alex", ...pending })).rejects.toBeInstanceOf(NotContributor);
    await concept.withdraw({ contributor: "daniel", ...pending });
    expect(await concept._get(pending)).toEqual([]);
    await expect(concept.withdraw({ contributor: "daniel", ...pending })).rejects.toBeInstanceOf(UnknownPitch);
    await expect(concept.review({ recipient: "alex", ...pending, fit: "MATCH", response: "" }))
      .rejects.toBeInstanceOf(UnknownPitch);

    const reviewed = await concept.pitch({ ...proposal, item: "bell track" });
    await concept.review({ recipient: "alex", ...reviewed, fit: "MISS", response: "Too sharp." });
    await expect(concept.withdraw({ contributor: "daniel", ...reviewed })).rejects.toBeInstanceOf(AlreadyReviewed);
    expect((await concept._get(reviewed))[0]).toMatchObject({ fit: "MISS", response: "Too sharp." });

    const again = await concept.pitch({ ...proposal, item: "guitar track" });
    expect(again.pitch).not.toBe(pending.pitch);
  });

  test("a withdrawal racing a review leaves exactly one of them in effect", async () => {
    for (let round = 0; round < 20; round += 1) {
      const { pitch } = await concept.pitch({
        contributor: "daniel", recipient: "alex", target: `race ${round}`, item: "track", note: "",
      });
      const [withdrawn, reviewed] = await Promise.allSettled([
        concept.withdraw({ contributor: "daniel", pitch }),
        new PitchingConcept(storage.db).review({ recipient: "alex", pitch, fit: "MATCH", response: "Yes." }),
      ]);
      const stored = await concept._get({ pitch });
      if (withdrawn.status === "fulfilled") {
        // The pitch is gone. A review that landed first was removed with it; one that landed after refused.
        expect(stored).toEqual([]);
        if (reviewed.status === "rejected") expect(reviewed.reason).toBeInstanceOf(UnknownPitch);
      } else {
        expect(withdrawn.reason).toBeInstanceOf(AlreadyReviewed);
        expect(reviewed.status).toBe("fulfilled");
        expect(stored[0]).toMatchObject({ fit: "MATCH", response: "Yes." });
      }
    }
  });

  test("clearing a target removes its pitches and their reviews but not another target's", async () => {
    const proposal = { contributor: "daniel", recipient: "alex", note: "" };
    const one = await concept.pitch({ ...proposal, target: "alex's soft", item: "harp track" });
    const two = await concept.pitch({ ...proposal, target: "alex's soft", item: "flute track" });
    await concept.review({ recipient: "alex", ...two, fit: "MATCH", response: "Lovely." });
    const kept = await concept.pitch({ ...proposal, target: "alex's loud", item: "harp track" });
    await concept.clearTarget({ target: "alex's soft" });
    await concept.clearTarget({ target: "alex's soft" });

    expect(await concept._get(one)).toEqual([]);
    expect(await concept._get(two)).toEqual([]);
    expect((await concept._sentBy({ contributor: "daniel" })).filter(row => row.target === "alex's soft")).toEqual([]);
    expect((await concept._get(kept))[0]!.target).toBe("alex's loud");
  });
});
