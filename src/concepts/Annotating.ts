import { MongoServerError, type Collection, type Db } from "mongodb";

export class AnnotationExists extends Error {}
export class UnknownAnnotation extends Error {}
export class NotAuthor extends Error {}

export type AnnotationRole = "EXAMPLE" | "COUNTEREXAMPLE";
export type AnnotationVisibility = "PRIVATE" | "SHARED";

type Explanation = { role: AnnotationRole; note: string; qualities: string[] };
type AuthorAction = { author: string; annotation: string };

interface Annotation extends Explanation {
  _id: string;
  author: string;
  item: string;
  context: string;
  visibility: AnnotationVisibility;
}

function normalized(qualities: string[]) {
  return [...new Set(qualities.map(quality => quality.trim().toLowerCase()).filter(Boolean))].sort();
}

export class AnnotatingConcept {
  private readonly annotations: Collection<Annotation>;
  #index?: Promise<string>;

  constructor(db: Db) {
    this.annotations = db.collection("annotating.annotations");
  }

  #ready() {
    this.#index ??= this.annotations.createIndex({ context: 1, item: 1 }, { unique: true })
      .catch((error: unknown) => {
        this.#index = undefined;
        throw error;
      });
    return this.#index;
  }

  async annotate({ author, item, context, role, note, qualities }: Explanation & { author: string; item: string; context: string }) {
    await this.#ready();

    const annotation = crypto.randomUUID();
    try {
      await this.annotations.insertOne({
        _id: annotation, author, item, context, role, note: note.trim(), qualities: normalized(qualities), visibility: "PRIVATE",
      });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new AnnotationExists("This item is already included here.");
      }
      throw error;
    }
    return { annotation };
  }

  async update({ author, annotation, role, note, qualities }: AuthorAction & Explanation) {
    const selector = await this.#byAuthor({ author, annotation });
    const result = await this.annotations.updateOne(selector, {
      $set: { role, note: note.trim(), qualities: normalized(qualities) },
    });
    if (!result.matchedCount) throw new UnknownAnnotation("This annotation could not be found.");
    return {};
  }

  async setVisibility({ author, annotation, visibility }: AuthorAction & { visibility: AnnotationVisibility }) {
    const selector = await this.#byAuthor({ author, annotation });
    const result = await this.annotations.updateOne(selector, { $set: { visibility } });
    if (!result.matchedCount) throw new UnknownAnnotation("This annotation could not be found.");
    return {};
  }

  async remove({ author, annotation }: AuthorAction) {
    const selector = await this.#byAuthor({ author, annotation });
    const result = await this.annotations.deleteOne(selector);
    if (!result.deletedCount) throw new UnknownAnnotation("This annotation could not be found.");
    return {};
  }

  async clearContext({ context }: { context: string }) {
    await this.annotations.deleteMany({ context });
    return {};
  }

  async _get({ annotation }: { annotation: string }) {
    const row = await this.annotations.findOne({ _id: annotation });
    if (!row) return [];
    const { author, item, context, role, note, qualities, visibility } = row;
    return [{ author, item, context, role, note, qualities, visibility }];
  }

  async _contexts(_: Record<string, never> = {}) {
    const contexts = await this.annotations.distinct("context");
    return contexts.map(context => ({ context }));
  }

  async _forContext({ context }: { context: string }) {
    const rows = await this.annotations.find({ context }).toArray();
    return rows.map(({ _id, author, item, role, note, qualities, visibility }) => ({
      annotation: _id, author, item, role, note, qualities, visibility,
    }));
  }

  async #byAuthor({ author, annotation }: AuthorAction) {
    const row = await this.annotations.findOne({ _id: annotation }, { projection: { author: 1 } });
    if (!row) throw new UnknownAnnotation("This annotation could not be found.");
    if (row.author !== author) throw new NotAuthor("You cannot edit another user's annotation.");
    return { _id: annotation, author };
  }
}
