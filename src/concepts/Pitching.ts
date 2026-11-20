import {MongoServerError, type Collection, type Db} from "mongodb";

// Errors
export class PITCH_NOT_FOUND extends Error{};
export class ALREADY_PITCHED extends Error{};
export class NOT_CONTRIBUTOR extends Error{};
export class ALREADY_REVIEWED extends Error{};
export class INVALID_REVIEW extends Error{};

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
    const pitch = crypto.randomUUID as Pitch;

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
    const existingPitch = await this.pitches.findOne({_id: pitch});
    if (existingPitch === null) throw new PITCH_NOT_FOUND ("This pitch could not be found.");
    if(existingPitch.contributor !== contributor) throw new NOT_CONTRIBUTOR ("You cannot withdraw someone else's pitch.");
    if(existingPitch.fit !== "PENDING") throw new ALREADY_REVIEWED ("This pitch has already been reviewed.");
    await this.pitches.deleteOne({_id: pitch});
    
  }

  async review({pitch, fit, response}: {pitch: Pitch, fit: Fit, response: string})  
  {
    if (fit === "PENDING") throw new INVALID_REVIEW ("Choose a fit.");
    await this.#ready();
    const existingPitch = await this.pitches.findOne({_id: pitch});
    if (existingPitch === null) throw new PITCH_NOT_FOUND("This pitch could not be found.");
    
  }

}

