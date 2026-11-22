import { createHash, randomBytes } from "node:crypto";
import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidUsername extends Error {}
export class InvalidPassword extends Error {}
export class UsernameTaken extends Error {}
export class InvalidCredentials extends Error {}
export class UnknownSession extends Error {}

type Credentials = { username: string; password: string };
type SessionInput = { session: string | null };

interface Account {
  _id: string;
  username: string;
  canonicalUsername: string;
  verifier: string;
}

interface Session {
  _id: string;
  user: string;
  expiresAt: Date;
}

const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

function validPassword(password: string) {
  const length = [...password].length;
  return length >= 8 && length <= 128;
}

function digest(session: string) {
  return createHash("sha256").update(session).digest("hex");
}

export class UserAuthenticatingConcept {
  private readonly accounts: Collection<Account>;
  private readonly sessions: Collection<Session>;
  #indexes?: Promise<unknown>;

  constructor(db: Db, private readonly now = () => new Date()) {
    this.accounts = db.collection("userAuthenticating.accounts");
    this.sessions = db.collection("userAuthenticating.sessions");
  }

  #ready() {
    this.#indexes ??= Promise.all([
      this.accounts.createIndex({ canonicalUsername: 1 }, { unique: true }),
      this.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).catch((error: unknown) => {
      this.#indexes = undefined;
      throw error;
    });
    return this.#indexes;
  }

  async register({ username, password }: Credentials) {
    const name = username.trim();
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(name)) {
      throw new InvalidUsername("Use 3 to 32 letters, numbers, underscores, or hyphens.");
    }
    if (!validPassword(password)) {
      throw new InvalidPassword("Use a password with 8 to 128 characters.");
    }

    await this.#ready();
    const user = crypto.randomUUID();
    const verifier = await Bun.password.hash(password, { algorithm: "argon2id" });
    try {
      await this.accounts.insertOne({ _id: user, username: name, canonicalUsername: name.toLowerCase(), verifier });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new UsernameTaken("That username is already taken.");
      }
      throw error;
    }
    return { user };
  }

  async authenticate({ username, password }: Credentials) {
    const account = await this.accounts.findOne({ canonicalUsername: username.trim().toLowerCase() });
    if (!validPassword(password) || !account || !await Bun.password.verify(password, account.verifier)) {
      throw new InvalidCredentials("The username or password is incorrect.");
    }

    await this.#ready();
    const session = randomBytes(32).toString("base64url");
    const expiresAt = new Date(this.now().getTime() + sessionLifetimeMs);
    await this.sessions.insertOne({ _id: digest(session), user: account._id, expiresAt });
    return { user: account._id, username: account.username, session, expiresAt };
  }

  async current({ session }: SessionInput) {
    const active = await this.sessions.findOne(this.#activeSession(session));
    const account = active && await this.accounts.findOne({ _id: active.user });
    if (!account) throw new UnknownSession("Sign in to continue.");
    return { user: account._id, username: account.username };
  }

  async logout({ session }: SessionInput) {
    const result = await this.sessions.deleteOne(this.#activeSession(session));
    if (!result.deletedCount) throw new UnknownSession("Sign in to continue.");
    return {};
  }

  async _byUsername({ username }: { username: string }) {
    const account = await this.accounts.findOne({ canonicalUsername: username.trim().toLowerCase() });
    return account ? [{ user: account._id, name: account.username }] : [];
  }

  async _username({ user }: { user: string }) {
    const account = await this.accounts.findOne({ _id: user }, { projection: { username: 1 } });
    return account ? [{ username: account.username }] : [];
  }

  #activeSession(session: string | null) {
    if (!session) throw new UnknownSession("Sign in to continue.");
    return { _id: digest(session), expiresAt: { $gt: this.now() } };
  }
}
