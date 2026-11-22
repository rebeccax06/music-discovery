import { MongoServerError, type Collection, type Db } from "mongodb";

export class SelfRequest extends Error {}
export class AlreadyFriends extends Error {}
export class RequestWaiting extends Error {}
export class RequestExists extends Error {}
export class NoRequest extends Error {}
export class NotFriends extends Error {}

interface FriendRequest { sender: string; recipient: string }
interface Friendship { first: string; second: string }

/** A friendship has no direction, so each pair is stored in one fixed order. */
function pair(a: string, b: string): Friendship {
  return a < b ? { first: a, second: b } : { first: b, second: a };
}

function duplicate(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}

export class FriendingConcept {
  private readonly requests: Collection<FriendRequest>;
  private readonly friendships: Collection<Friendship>;
  #indexes?: Promise<unknown>;

  constructor(db: Db) {
    this.requests = db.collection("friending.requests");
    this.friendships = db.collection("friending.friendships");
  }

  #ready() {
    this.#indexes ??= Promise.all([
      this.requests.createIndex({ sender: 1, recipient: 1 }, { unique: true }),
      this.requests.createIndex({ recipient: 1 }),
      this.friendships.createIndex({ first: 1, second: 1 }, { unique: true }),
      this.friendships.createIndex({ second: 1 }),
    ]).catch((error: unknown) => {
      this.#indexes = undefined;
      throw error;
    });
    return this.#indexes;
  }

  async request({ sender, recipient }: FriendRequest) {
    if (sender === recipient) throw new SelfRequest("You cannot add yourself as a friend.");
    await this.#ready();
    if (await this.friendships.countDocuments(pair(sender, recipient), { limit: 1 })) {
      throw new AlreadyFriends("You are already friends.");
    }
    if (await this.requests.countDocuments({ sender: recipient, recipient: sender }, { limit: 1 })) {
      throw new RequestWaiting("They have already asked to be your friend. Accept their request.");
    }
    try {
      await this.requests.insertOne({ sender, recipient });
    } catch (error) {
      if (duplicate(error)) throw new RequestExists("You have already asked. They have not answered yet.");
      throw error;
    }
    return {};
  }

  async accept({ recipient, sender }: FriendRequest) {
    await this.#ready();
    // Deleting the request is what claims it, so an accept racing a cancel or a decline cannot both win.
    const claimed = await this.requests.deleteOne({ sender, recipient });
    if (!claimed.deletedCount) throw new NoRequest("This friend request is no longer waiting.");
    try {
      await this.friendships.insertOne(pair(sender, recipient));
    } catch (error) {
      if (!duplicate(error)) throw error;
    }
    // Two people who asked each other at the same moment leave a second request behind.
    await this.requests.deleteOne({ sender: recipient, recipient: sender });
    return {};
  }

  async decline({ recipient, sender }: FriendRequest) {
    return this.#withdraw({ sender, recipient });
  }

  async cancel({ sender, recipient }: FriendRequest) {
    return this.#withdraw({ sender, recipient });
  }

  async unfriend({ person, friend }: { person: string; friend: string }) {
    const result = await this.friendships.deleteOne(pair(person, friend));
    if (!result.deletedCount) throw new NotFriends("You are not friends.");
    return {};
  }

  async _friends({ person }: { person: string }) {
    const rows = await this.friendships.find({ $or: [{ first: person }, { second: person }] }).toArray();
    return rows.map(({ first, second }) => ({ friend: first === person ? second : first }));
  }

  async _friendship({ person, other }: { person: string; other: string }) {
    if (person === other) return [];
    return await this.friendships.countDocuments(pair(person, other), { limit: 1 }) ? [{ friend: other }] : [];
  }

  async _received({ recipient }: { recipient: string }) {
    const rows = await this.requests.find({ recipient }).toArray();
    return rows.map(({ sender }) => ({ sender }));
  }

  async _sent({ sender }: { sender: string }) {
    const rows = await this.requests.find({ sender }).toArray();
    return rows.map(({ recipient }) => ({ recipient }));
  }

  async #withdraw(request: FriendRequest) {
    const result = await this.requests.deleteOne(request);
    if (!result.deletedCount) throw new NoRequest("This friend request is no longer waiting.");
    return {};
  }
}
