import { createHash, randomBytes } from "node:crypto";
import type { Collection, Db } from "mongodb";

export class NotSignedIn extends Error {}
export class SessionEnded extends Error {}

const DAY = 24 * 60 * 60 * 1000;
const IDLE = 7 * DAY;
const LIFETIME = 90 * DAY;

interface SessionDocument {
  /** The SHA-256 digest of the session credential; the credential itself is never stored. */
  _id: string;
  subject: string;
  lastUsed: Date;
  expiresAt: Date;
}

function digest(session: string) {
  return createHash("sha256").update(session).digest("hex");
}

/** A request without a session cookie supplies null, so anything but a non-empty string is an unknown session. */
function presented(session: unknown): session is string {
  return typeof session === "string" && session !== "";
}

/** Matches the session only while it is usable at the instant `at`. */
function usable(session: string, at: Date) {
  return { _id: digest(session), lastUsed: { $gt: new Date(at.getTime() - IDLE) }, expiresAt: { $gt: at } };
}

/** Lets people stay signed in across requests without sending their password each time. */
export class SessioningConcept {
  readonly #sessions: Collection<SessionDocument>;
  #indexes?: Promise<unknown>;

  constructor(db: Db) {
    this.#sessions = db.collection("sessioning.sessions");
  }

  /** Lets MongoDB delete sessions once they can no longer be used: after expiresAt, or a week after the last use. */
  #ready() {
    this.#indexes ??= Promise.all([
      this.#sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      this.#sessions.createIndex({ lastUsed: 1 }, { expireAfterSeconds: IDLE / 1000 }),
    ]).catch((error: unknown) => {
      this.#indexes = undefined;
      throw error;
    });
    return this.#indexes;
  }

  async start({ subject, at }: { subject: string; at: Date }) {
    const session = randomBytes(32).toString("base64url");
    const expiresAt = new Date(at.getTime() + LIFETIME);
    await this.#ready();
    await this.#sessions.insertOne({ _id: digest(session), subject, lastUsed: at, expiresAt });
    return { session, expiresAt };
  }

  async use({ session, at }: { session: string | null; at: Date }) {
    if (!presented(session)) throw new NotSignedIn("Sign in to continue.");
    const used = await this.#sessions.findOneAndUpdate(usable(session, at), { $max: { lastUsed: at } });
    if (!used) throw new NotSignedIn("Sign in to continue.");
    return { subject: used.subject };
  }

  async end({ session, at }: { session: string | null; at: Date }) {
    if (!presented(session)) throw new SessionEnded("Sign in to continue.");
    const ended = await this.#sessions.findOneAndDelete(usable(session, at));
    if (!ended) throw new SessionEnded("Sign in to continue.");
    return { session };
  }
}
