import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  AlreadyFriends, FriendingConcept, NoRequest, NotFriends, RequestExists, RequestWaiting, SelfRequest,
} from "../../src/concepts/Friending.ts";
import { isolatedDatabase } from "../support/mongo.ts";

describe("Friending", () => {
  let storage: Awaited<ReturnType<typeof isolatedDatabase>>;
  let concept: FriendingConcept;

  beforeAll(async () => {
    storage = await isolatedDatabase();
    concept = new FriendingConcept(storage.db);
  });
  afterAll(async () => { await storage?.close(); });

  const friends = async (person: string) => (await concept._friends({ person })).map(row => row.friend).sort();

  test("a request changes nothing until it is accepted, and then each is the other's friend until either leaves", async () => {
    await concept.request({ sender: "daniel", recipient: "alex" });
    expect(await concept._received({ recipient: "alex" })).toEqual([{ sender: "daniel" }]);
    expect(await concept._sent({ sender: "daniel" })).toEqual([{ recipient: "alex" }]);
    expect(await friends("alex")).toEqual([]);
    expect(await concept._friendship({ person: "alex", other: "daniel" })).toEqual([]);

    await concept.accept({ recipient: "alex", sender: "daniel" });
    expect(await friends("alex")).toEqual(["daniel"]);
    expect(await friends("daniel")).toEqual(["alex"]);
    expect(await concept._friendship({ person: "alex", other: "daniel" })).toEqual([{ friend: "daniel" }]);
    expect(await concept._friendship({ person: "daniel", other: "alex" })).toEqual([{ friend: "alex" }]);
    expect(await concept._received({ recipient: "alex" })).toEqual([]);
    expect(await concept._sent({ sender: "daniel" })).toEqual([]);

    await concept.unfriend({ person: "alex", friend: "daniel" });
    expect(await friends("alex")).toEqual([]);
    expect(await friends("daniel")).toEqual([]);
    await expect(concept.unfriend({ person: "daniel", friend: "alex" })).rejects.toBeInstanceOf(NotFriends);
    await concept.request({ sender: "alex", recipient: "daniel" });
    expect(await concept._received({ recipient: "daniel" })).toEqual([{ sender: "alex" }]);
  });

  test("refuses a request to oneself, to a friend, a repeated request, and a request to someone who already asked", async () => {
    await expect(concept.request({ sender: "mira", recipient: "mira" })).rejects.toBeInstanceOf(SelfRequest);
    expect(await concept._friendship({ person: "mira", other: "mira" })).toEqual([]);

    await concept.request({ sender: "mira", recipient: "sam" });
    await expect(concept.request({ sender: "mira", recipient: "sam" })).rejects.toBeInstanceOf(RequestExists);
    await expect(concept.request({ sender: "sam", recipient: "mira" })).rejects.toBeInstanceOf(RequestWaiting);
    expect(await concept._sent({ sender: "sam" })).toEqual([]);

    await concept.accept({ recipient: "sam", sender: "mira" });
    await expect(concept.request({ sender: "mira", recipient: "sam" })).rejects.toBeInstanceOf(AlreadyFriends);
    await expect(concept.request({ sender: "sam", recipient: "mira" })).rejects.toBeInstanceOf(AlreadyFriends);
    expect(await friends("mira")).toEqual(["sam"]);
  });

  test("only the person asked can accept or decline, only the asker can cancel, and each leaves no trace", async () => {
    await concept.request({ sender: "ines", recipient: "noor" });
    await expect(concept.accept({ recipient: "ines", sender: "noor" })).rejects.toBeInstanceOf(NoRequest);
    await expect(concept.accept({ recipient: "zed", sender: "ines" })).rejects.toBeInstanceOf(NoRequest);
    await expect(concept.decline({ recipient: "ines", sender: "noor" })).rejects.toBeInstanceOf(NoRequest);
    await expect(concept.cancel({ sender: "noor", recipient: "ines" })).rejects.toBeInstanceOf(NoRequest);
    expect(await concept._received({ recipient: "noor" })).toEqual([{ sender: "ines" }]);
    expect(await friends("ines")).toEqual([]);

    await concept.decline({ recipient: "noor", sender: "ines" });
    expect(await concept._received({ recipient: "noor" })).toEqual([]);
    await expect(concept.accept({ recipient: "noor", sender: "ines" })).rejects.toBeInstanceOf(NoRequest);

    await concept.request({ sender: "ines", recipient: "noor" });
    await concept.cancel({ sender: "ines", recipient: "noor" });
    expect(await concept._sent({ sender: "ines" })).toEqual([]);
    await expect(concept.accept({ recipient: "noor", sender: "ines" })).rejects.toBeInstanceOf(NoRequest);
    expect(await friends("noor")).toEqual([]);
  });

  test("an accept racing a cancel leaves exactly one of them in effect", async () => {
    for (let round = 0; round < 20; round += 1) {
      const sender = `asker ${round}`;
      const recipient = `asked ${round}`;
      await concept.request({ sender, recipient });
      const [accepted, cancelled] = await Promise.allSettled([
        concept.accept({ recipient, sender }),
        new FriendingConcept(storage.db).cancel({ sender, recipient }),
      ]);
      expect([accepted.status, cancelled.status].sort()).toEqual(["fulfilled", "rejected"]);
      expect(await friends(sender)).toEqual(accepted.status === "fulfilled" ? [recipient] : []);
      expect(await concept._sent({ sender })).toEqual([]);
    }
  });

  test("two people who ask each other at the same moment can still become friends, once, with no request left over", async () => {
    for (let round = 0; round < 20; round += 1) {
      const a = `left ${round}`;
      const b = `right ${round}`;
      const asked = await Promise.allSettled([
        concept.request({ sender: a, recipient: b }),
        new FriendingConcept(storage.db).request({ sender: b, recipient: a }),
      ]);
      expect(asked.some(result => result.status === "fulfilled")).toBe(true);
      const asker = asked[0].status === "fulfilled" ? a : b;
      const answerer = asker === a ? b : a;
      await concept.accept({ recipient: answerer, sender: asker });

      expect(await friends(a)).toEqual([b]);
      expect(await friends(b)).toEqual([a]);
      for (const person of [a, b]) {
        expect(await concept._sent({ sender: person })).toEqual([]);
        expect(await concept._received({ recipient: person })).toEqual([]);
      }
    }
  });

  test("one person's friendships and requests are separate from another's", async () => {
    await concept.request({ sender: "hub", recipient: "one" });
    await concept.request({ sender: "two", recipient: "hub" });
    await concept.request({ sender: "three", recipient: "hub" });
    await concept.accept({ recipient: "one", sender: "hub" });
    await concept.accept({ recipient: "hub", sender: "two" });

    expect(await friends("hub")).toEqual(["one", "two"]);
    expect(await friends("one")).toEqual(["hub"]);
    expect(await concept._friendship({ person: "one", other: "two" })).toEqual([]);
    expect(await concept._received({ recipient: "hub" })).toEqual([{ sender: "three" }]);
    await concept.unfriend({ person: "two", friend: "hub" });
    expect(await friends("hub")).toEqual(["one"]);
  });
});
