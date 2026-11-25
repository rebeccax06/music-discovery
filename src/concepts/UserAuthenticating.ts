import { createHash, randomBytes } from "node:crypto";
import { MongoServerError, type Collection, type Db } from "mongodb";
import type { CommonsProvider } from "../commonsProvider.ts";

export class InvalidUsername extends Error {}
export class InvalidPassword extends Error {}
export class UsernameTaken extends Error {}
export class InvalidCredentials extends Error {}
export class UnknownSession extends Error {}
export class CommonsSignInRefused extends Error {}

type Credentials = { username: string; password: string };
type SessionInput = { session: string | null };

interface Account {
  _id: string;
  username: string;
  canonicalUsername: string;
  verifier?: string;
  commonsIdentity?: string;
}

interface Session {
  _id: string;
  user: string;
  expiresAt: Date;
}

interface CommonsAttempt {
  _id: string;
  expiresAt: Date;
  stateDigest: string;
  verifier?: string;
  commonsIdentity?: string;
}

const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const attemptLifetimeMs = 10 * 60 * 1000;

function validUsername(username: string) {
  const name = username.trim();
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(name)) {
    throw new InvalidUsername("Use 3 to 32 letters, numbers, underscores, or hyphens.");
  }
  return name;
}

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
  private readonly attempts: Collection<CommonsAttempt>;
  #indexes?: Promise<unknown>;

  constructor(db: Db, private readonly now = () => new Date(), private readonly commons?: CommonsProvider) {
    this.accounts = db.collection("userAuthenticating.accounts");
    this.sessions = db.collection("userAuthenticating.sessions");
    this.attempts = db.collection("userAuthenticating.commonsAttempts");
  }

  #ready() {
    this.#indexes ??= Promise.all([
      this.accounts.createIndex({ canonicalUsername: 1 }, { unique: true }),
      this.accounts.createIndex({ commonsIdentity: 1 }, { unique: true, sparse: true }),
      this.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      this.attempts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).catch((error: unknown) => {
      this.#indexes = undefined;
      throw error;
    });
    return this.#indexes;
  }

  async register({ username, password }: Credentials) {
    const name = validUsername(username);
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
    if (!validPassword(password) || !account?.verifier || !await Bun.password.verify(password, account.verifier)) {
      throw new InvalidCredentials("The username or password is incorrect.");
    }

    return this.#startSession(account);
  }

  async startCommons() {
    if (!this.commons) throw new CommonsSignInRefused("Commons sign-in is unavailable.");
    await this.#ready();
    const attempt = randomBytes(32).toString("base64url");
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const expiresAt = new Date(this.now().getTime() + attemptLifetimeMs);
    await this.attempts.insertOne({ _id: digest(attempt), stateDigest: digest(state), verifier, expiresAt });
    return { attempt, expiresAt, address: this.commons.address({ state, verifier }) };
  }

  async finishCommons({ attempt, state, code }: { attempt: string | null; state: string; code: string }) {
    if (!this.commons || !attempt) throw new CommonsSignInRefused("Restart Commons sign-in.");
    const active = { _id: digest(attempt), expiresAt: { $gt: this.now() } };
    // Claim the verifier before contacting Commons. Only one request can redeem this attempt.
    const pending = await this.attempts.findOneAndUpdate(
      { ...active, stateDigest: digest(state), verifier: { $exists: true } },
      { $unset: { verifier: "" } },
      { returnDocument: "before" },
    );
    if (!pending?.verifier) throw new CommonsSignInRefused("Restart Commons sign-in.");
    const identity = await this.commons.redeem({ code, verifier: pending.verifier });
    if (!identity) throw new CommonsSignInRefused("Commons did not complete sign-in.");

    const commonsIdentity = JSON.stringify([this.commons.issuer, identity.subject]);
    const confirmed = await this.attempts.updateOne(
      { ...active, expiresAt: { $gt: this.now() } },
      { $set: { commonsIdentity } },
    );
    if (!confirmed.matchedCount) throw new CommonsSignInRefused("Restart Commons sign-in.");
    return this.#completeCommons(attempt, commonsIdentity, identity.username);
  }

  async chooseCommonsUsername({ attempt, username }: { attempt: string | null; username: string }) {
    if (!attempt) throw new CommonsSignInRefused("Restart Commons sign-in.");
    const pending = await this.attempts.findOne({ _id: digest(attempt), expiresAt: { $gt: this.now() } });
    if (!pending?.commonsIdentity) throw new CommonsSignInRefused("Restart Commons sign-in.");
    return this.#completeCommons(attempt, pending.commonsIdentity, username);
  }

  async #completeCommons(attempt: string, commonsIdentity: string, username: string) {
    const account = await this.#commonsAccount(commonsIdentity, username);
    const claimed = await this.attempts.deleteOne({ _id: digest(attempt), commonsIdentity, expiresAt: { $gt: this.now() } });
    if (!claimed.deletedCount) throw new CommonsSignInRefused("Restart Commons sign-in.");
    return this.#startSession(account);
  }

  async #commonsAccount(commonsIdentity: string, username: string) {
    const existing = await this.accounts.findOne({ commonsIdentity });
    if (existing) return existing;

    const name = validUsername(username);
    const account = { _id: crypto.randomUUID(), username: name, canonicalUsername: name.toLowerCase(), commonsIdentity };
    try {
      await this.accounts.insertOne(account);
      return account;
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
      // A concurrent sign-in for the same verified identity may have just created the account.
      const linked = await this.accounts.findOne({ commonsIdentity });
      if (linked) return linked;
      throw new UsernameTaken("That username is already taken.");
    }
  }

  async #startSession(account: Account) {
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
