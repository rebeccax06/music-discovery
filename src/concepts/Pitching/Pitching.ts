import {MongoServerError, type Collection, type Db, ObjectId} from "mongodb";

// Errors
export class PitchNotFound extends Error{};
export class AlreadyPitched extends Error{};
export class NotContributor extends Error{};
export class AlreadyReviewed extends Error{};
export class InvalidReview extends Error{};
export class NotReviewed extends Error{};
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
      if (isDuplicate(error)) throw new AlreadyPitched("This item has already been pitched here.");
      throw error;
    }
  return {pitch};
  }

  async deletePitch({contributor, pitch}: {contributor: Contributor, pitch: Pitch})
  {
    await this.#ready();
    const result = await this.pitches.deleteOne({_id: pitch, contributor, fit: "PENDING"});
    if (result.deletedCount === 1) return {};

    // Distinguish failure cases
    const existing = await this.pitches.findOne({_id: pitch}, {projection: {contributor: 1, fit: 1}});
    if (existing === null) throw new PitchNotFound("This pitch could not be found.");
    if (existing.contributor !== contributor) throw new NotContributor("You cannot withdraw someone else's pitch.");
    throw new AlreadyReviewed("This pitch has already been reviewed.");   
  }

  async review({pitch, fit, response}: {pitch: Pitch, fit: Fit, response: string})  
  {
    if (fit === "PENDING") throw new InvalidReview ("Choose a fit.") 
    await this.#ready();
    const updatedPitch = await this.pitches.findOneAndUpdate(
      {_id:pitch},
      {$set: {fit, response: response.trim(), responseShared: false}},
      {returnDocument: "after"}
    );
    if (updatedPitch === null) throw new PitchNotFound ("This pitch could not be found.");
    return {};
  }

  async setVisibility({contributor, pitch, visibility}: {contributor: Contributor, pitch: Pitch, visibility: PitchVisibility})
  {
  await this.#ready();
  const updateResult = await this.pitches.updateOne(
    {_id: pitch, contributor},
    {$set: {visibility}});

    if (updateResult.matchedCount === 1) return {};

    // Distinguish match failure cases
    const existing = await this.pitches.findOne({_id: pitch}, {projection: {_id: 1}});
    if (existing === null) throw new PitchNotFound("This pitch could not be found.");

    throw new NotContributor("You cannot change someone else's pitch.");
  }

  async setResponseShared({pitch, shared}: {pitch: Pitch, shared: boolean}): Promise<Record<string, never>>
  {
    await this.#ready();
    const updateResult = await this.pitches.updateOne(
      {_id: pitch, fit: {$ne: "PENDING"}},
      {$set: {responseShared: shared}}
    );

    if (updateResult.matchedCount === 1) return {};

    // Distinguish match failure cases
    const existingPitch = await this.pitches.findOne({_id: pitch});
    if (existingPitch === null) throw new PitchNotFound("This pitch could not be found.");
    if (existingPitch.fit === "PENDING") throw new NotReviewed ("There is no review to share.");
    // Reviewed between the update and the lookup; retry so the flag is actually set.
    return this.setResponseShared({pitch, shared});
  }

  async clearTarget({target}: {target: Target})
  {
    await this.#ready();
    await this.pitches.deleteMany({target: target});
    return {};
  }

  async _get({pitch}: {pitch: Pitch})
  {
    const row = await this.pitches.findOne({_id: pitch});

    if (!row) return [];
    const {contributor, target, item, visibility, fit, response, responseShared} = row;
    return [{contributor, target, item, visibility, fit, response, responseShared}];
  }

  async _forTarget({target}: {target: Target})
  {
    const rows = await this.pitches.find({target: target}).toArray();

    return rows.map(({_id, contributor, item, visibility, fit, response, responseShared }) => ({pitch: _id, contributor, item, visibility, fit, response, responseShared}));
}
}
