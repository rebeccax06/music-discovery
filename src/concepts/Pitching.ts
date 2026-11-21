import {MongoServerError, type Collection, type Db, ObjectId} from "mongodb";

// Errors
export class PITCH_NOT_FOUND extends Error{};
export class ALREADY_PITCHED extends Error{};
export class NOT_CONTRIBUTOR extends Error{};
export class ALREADY_REVIEWED extends Error{};
export class INVALID_REVIEW extends Error{};
export class NOT_REVIEWED extends Error{};
// 11000 is the MongoDB error code for a write that violates a unique index.
const isDuplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000;
// End Errors

// Types
export type Pitch = string & {readonly __brand: "Pitch"};
export type PitchVisibility = "PRIVATE" | "SHARED";
export type Fit = "PENDING" | "PARTIAL" | "MISS" | "MATCH";
// End Types
interface PitchingDocument<Contributor, Target, Item>
{
  _id: Pitch,
  contributor: Contributor,
  target: Target,
  item: Item,
  visibility: PitchVisibility,
  fit: Fit,
  response: string,
  responseShared: boolean,
}

export class PitchingConcept<Contributor extends string, Target extends string, Item extends string>
{
  private readonly pitches: Collection<PitchingDocument<Contributor, Target, Item>>;
  private indexes: Promise<unknown> | undefined;   

  constructor(database: Db, name="Pitching")
  {
    this.pitches = database.collection(`${name.toLowerCase()}.pitches`);
  }

  // Enforces that (target, item) is a unique index for pitches

  #ready()
  {
    this.indexes ??= this.pitches
                      .createIndex({target: 1, item: 1}, {unique: true})
                      .catch((error:unknown) => 
                      {
                        this.indexes = undefined;
                        throw error;
                      })
                    return this.indexes;
  }

  async createPitch({contributor, target, item, visibility}: {contributor: Contributor, target: Target, item: Item, visibility:PitchVisibility})
  {
    const pitch = new ObjectId().toHexString() as Pitch;

    await this.#ready();

    try {
      await this.pitches.insertOne({_id: pitch, target, item, contributor, visibility, response: "", responseShared: false, fit:"PENDING"  })
    } catch (error)
    {
      if (isDuplicate(error)) throw new ALREADY_PITCHED("This item has already been pitched here.");
      throw error;
    }
  return {pitch};
  }

  async deletePitch({contributor, pitch}: {contributor: Contributor, pitch: Pitch})
  {
    await this.#ready();
    const result = await this.pitches.deleteOne({_id: pitch, contributor, fit: "PENDING"});
    if (result.deletedCount === 1) return;

    // Distinguish failure cases
    const existing = await this.pitches.findOne({_id: pitch}, {projection: {contributor: 1, fit: 1}});
    if (existing === null) throw new PITCH_NOT_FOUND("This pitch could not be found.");
    if (existing.contributor !== contributor) throw new NOT_CONTRIBUTOR("You cannot withdraw someone else's pitch.");
    throw new ALREADY_REVIEWED("This pitch has already been reviewed.");   
  }

  async review({pitch, fit, response}: {pitch: Pitch, fit: Fit, response: string})  
  {
    if (fit === "PENDING") throw new INVALID_REVIEW ("Choose a fit.");
    await this.#ready();
    const updatedPitch = await this.pitches.findOneAndUpdate(
      {_id:pitch},
      {$set: {fit, response: response.trim(), responseShared: false}},
      {returnDocument: "after"}
    );
    if (updatedPitch === null) throw new PITCH_NOT_FOUND ("This pitch could not be found.");
  }

  async setVisibility({contributor, pitch, visibility}: {contributor: Contributor, pitch: Pitch, visibility: PitchVisibility})
  {
  await this.#ready();
  const updateResult = await this.pitches.updateOne(
    {_id: pitch, contributor},
    {$set: {visibility}});

    if (updateResult.matchedCount === 1) return;

    // Distinguish match failure cases
    const existing = await this.pitches.findOne({_id: pitch}, {projection: {_id: 1}});
    if (existing === null) throw new PITCH_NOT_FOUND("This pitch could not be found.");

    throw new NOT_CONTRIBUTOR("You cannot change someone else's pitch");
  }

  async setResponseShared({pitch, shared}: {pitch: Pitch, shared: boolean})
  {
    await this.#ready();
    const updateResult = await this.pitches.updateOne(
      {_id: pitch, fit: {$ne: "PENDING"}},
      {$set: {responseShared: shared}}
    );

    if (updateResult.matchedCount === 1) return;

    // Distinguish match failure cases
    const existingPitch = await this.pitches.findOne({_id: pitch});
    if (existingPitch === null) throw new PITCH_NOT_FOUND("This pitch could not be found.");
    if (existingPitch.fit === "PENDING") throw new NOT_REVIEWED("There is no review to share.");
  }

  async clearTarget({target}: {target: Target})
  {
    await this.#ready();
    await this.pitches.deleteMany({target: target});
  }

  async _get({pitch}: {pitch: Pitch})
  {
    const row = await this.pitches.findOne({pitch});

    if (!row) return [];
    return [row];
    
  }

  async _forTarget({target}: {target: Target})
  {
    const rows = await this.pitches.find({target: target}).toArray();

    return rows.map(({_id, contributor, item, visibility, fit, response, responseShared }) => ({pitch: _id, contributor, item, visibility, fit, response, responseShared}));
  }
}

