import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidPassword extends Error {}
export class PasswordSet extends Error {}
export class InvalidCredentials extends Error {}

interface VerifierDocument {
  _id: string;
  verifier: string;
}

/** Counts Unicode code points and uses the password exactly as supplied. */
function acceptable(password: string) {
  const length = [...password].length;
  return length >= 8 && length <= 128;
}

function duplicate(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}

/** Lets people come back to their account by proving who they are with a password. */
export class AuthenticatingConcept {
  readonly #users: Collection<VerifierDocument>;

  constructor(db: Db) {
    this.#users = db.collection("authenticating.users");
  }

  async set({ user, password }: { user: string; password: string }) {
    if (!acceptable(password)) throw new InvalidPassword("Use a password with 8 to 128 characters.");
    const verifier = await Bun.password.hash(password, { algorithm: "argon2id" });
    try {
      // The user is the document id, so MongoDB refuses a second verifier even when two sets race.
      await this.#users.insertOne({ _id: user, verifier });
    } catch (error) {
      if (duplicate(error)) throw new PasswordSet("This account already has a password.");
      throw error;
    }
    return { user };
  }

  async authenticate({ user, password }: { user: string; password: string }) {
    // An unacceptable password can never match a verifier, so it is refused without hashing.
    const found = acceptable(password) ? await this.#users.findOne({ _id: user }) : null;
    if (!found || !await Bun.password.verify(password, found.verifier)) {
      throw new InvalidCredentials("The username or password is incorrect.");
    }
    return { user };
  }

  async _acceptable({ password }: { password: string }): Promise<{ acceptable: boolean }> {
    return { acceptable: acceptable(password) };
  }
}
