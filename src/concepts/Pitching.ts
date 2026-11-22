import { MongoServerError, type Collection, type Db } from "mongodb";

export class SelfPitch extends Error {}
export class AlreadyPitched extends Error {}
export class UnknownPitch extends Error {}
export class NotContributor extends Error {}
export class NotRecipient extends Error {}
export class AlreadyReviewed extends Error {}
export class InvalidReview extends Error {}

export type Fit = "PENDING" | "MATCH" | "PARTIAL" | "MISS";

interface Pitch {
  _id: string;
  contributor: string;
  recipient: string;
  target: string;
  item: string;
  note: string;
  fit: Fit;
  response: string;
}

export class PitchingConcept {
  private readonly pitches: Collection<Pitch>;
  #indexes?: Promise<unknown>;

  constructor(db: Db) {
    this.pitches = db.collection("pitching.pitches");
  }

  #ready() {
    this.#indexes ??= Promise.all([
      this.pitches.createIndex({ target: 1, item: 1 }, { unique: true }),
      this.pitches.createIndex({ contributor: 1 }),
    ]).catch((error: unknown) => {
      this.#indexes = undefined;
      throw error;
    });
    return this.#indexes;
  }

  async pitch({ contributor, recipient, target, item, note }: {
    contributor: string; recipient: string; target: string; item: string; note: string;
  }) {
    if (contributor === recipient) throw new SelfPitch("You cannot suggest an item to yourself.");
    await this.#ready();

    const pitch = crypto.randomUUID();
    try {
      await this.pitches.insertOne({
        _id: pitch, contributor, recipient, target, item, note: note.trim(), fit: "PENDING", response: "",
      });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new AlreadyPitched("This item has already been suggested here.");
      }
      throw error;
    }
    return { pitch };
  }

  async withdraw({ contributor, pitch }: { contributor: string; pitch: string }) {
    const row = await this.pitches.findOne({ _id: pitch }, { projection: { contributor: 1 } });
    if (!row) throw new UnknownPitch("This suggestion could not be found.");
    if (row.contributor !== contributor) throw new NotContributor("You cannot withdraw someone else's suggestion.");
    // The delete is conditional on PENDING, so a review that lands first wins and this refuses.
    const result = await this.pitches.deleteOne({ _id: pitch, contributor, fit: "PENDING" });
    if (!result.deletedCount) {
      if (await this.pitches.countDocuments({ _id: pitch }, { limit: 1 })) {
        throw new AlreadyReviewed("This suggestion has already been reviewed.");
      }
      throw new UnknownPitch("This suggestion could not be found.");
    }
    return {};
  }

  async review({ recipient, pitch, fit, response }: { recipient: string; pitch: string; fit: Fit; response: string }) {
    const row = await this.pitches.findOne({ _id: pitch }, { projection: { recipient: 1 } });
    if (!row) throw new UnknownPitch("This suggestion could not be found.");
    if (row.recipient !== recipient) throw new NotRecipient("Only the person this was suggested to can review it.");
    if (fit === "PENDING") throw new InvalidReview("Choose a fit.");
    const result = await this.pitches.updateOne({ _id: pitch, recipient }, { $set: { fit, response: response.trim() } });
    if (!result.matchedCount) throw new UnknownPitch("This suggestion could not be found.");
    return {};
  }

  async clearTarget({ target }: { target: string }) {
    await this.pitches.deleteMany({ target });
    return {};
  }

  async _get({ pitch }: { pitch: string }) {
    const row = await this.pitches.findOne({ _id: pitch });
    if (!row) return [];
    const { contributor, recipient, target, item, note, fit, response } = row;
    return [{ contributor, recipient, target, item, note, fit, response }];
  }

  async _forTarget({ target }: { target: string }) {
    const rows = await this.pitches.find({ target }).toArray();
    return rows.map(({ _id, contributor, item, note, fit, response }) => ({
      pitch: _id, contributor, item, note, fit, response,
    }));
  }

  async _sentBy({ contributor }: { contributor: string }) {
    const rows = await this.pitches.find({ contributor }).toArray();
    return rows.map(({ _id, recipient, target, item, note, fit }) => ({
      pitch: _id, recipient, target, item, note, reviewed: fit !== "PENDING",
    }));
  }
}
