import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidUsername extends Error {}
export class UsernameTaken extends Error {}

const USERNAME = /^[A-Za-z0-9_-]{3,32}$/;

interface UserDocument {
  _id: string;
  username: string;
  canonicalUsername: string;
}

function canonical(username: string) {
  return username.trim().toLowerCase();
}

function duplicate(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}

/** Lets people choose a username that others can find them by. */
export class RegisteringConcept {
  readonly #users: Collection<UserDocument>;
  #indexes?: Promise<unknown>;

  constructor(db: Db) {
    this.#users = db.collection("registering.users");
  }

  /** The unique index makes MongoDB refuse a taken username even when two people register it at once. */
  #ready() {
    this.#indexes ??= this.#users.createIndex({ canonicalUsername: 1 }, { unique: true }).catch((error: unknown) => {
      this.#indexes = undefined;
      throw error;
    });
    return this.#indexes;
  }

  async register({ username }: { username: string }) {
    const name = username.trim();
    if (!USERNAME.test(name)) {
      throw new InvalidUsername("Use 3 to 32 letters, numbers, underscores, or hyphens.");
    }
    await this.#ready();
    const user = crypto.randomUUID();
    try {
      await this.#users.insertOne({ _id: user, username: name, canonicalUsername: name.toLowerCase() });
    } catch (error) {
      if (duplicate(error)) throw new UsernameTaken("That username is already taken.");
      throw error;
    }
    return { user };
  }

  async _byUsername({ username }: { username: string }): Promise<Array<{ user: string; username: string }>> {
    const found = await this.#users.findOne({ canonicalUsername: canonical(username) });
    return found ? [{ user: found._id, username: found.username }] : [];
  }

  async _username({ user }: { user: string }): Promise<Array<{ username: string }>> {
    const found = await this.#users.findOne({ _id: user });
    return found ? [{ username: found.username }] : [];
  }
}
