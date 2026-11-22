import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidAssociation extends Error {}
export class AssociationExists extends Error {}
export class UnknownAssociation extends Error {}
export class NotOwner extends Error {}
export type AssociationVisibility = "PRIVATE" | "LIMITED" | "PUBLIC";

type Definition = { label: string; description: string; visibility: AssociationVisibility };
type OwnerAction = { user: string; association: string };

interface Association extends Definition {
  _id: string;
  user: string;
  normalizedLabel: string;
}

function displayLabel(label: string) {
  return label.trim().replace(/\s+/g, " ");
}

function byLabel(
  a: { label: string; association: string },
  b: { label: string; association: string },
) {
  if (a.label < b.label) return -1;
  if (a.label > b.label) return 1;
  if (a.association < b.association) return -1;
  if (a.association > b.association) return 1;
  return 0;
}

export class AssociatingConcept {
  private readonly associations: Collection<Association>;
  #index?: Promise<string>;

  constructor(db: Db) {
    this.associations = db.collection("associating.associations");
  }

  #ready() {
    this.#index ??= this.associations.createIndex(
      { user: 1, normalizedLabel: 1 },
      { unique: true },
    ).catch((error: unknown) => {
      this.#index = undefined;
      throw error;
    });
    return this.#index;
  }

  async associate({ user, label, description, visibility }: Definition & { user: string }) {
    const shown = displayLabel(label);
    const text = description.trim();
    if (!shown) throw new InvalidAssociation("Provide a word.");
    await this.#ready();

    const association = crypto.randomUUID();
    try {
      await this.associations.insertOne({
        _id: association,
        user,
        label: shown,
        normalizedLabel: shown.toLowerCase(),
        description: text,
        visibility,
      });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new AssociationExists("You have already defined this word.");
      }
      throw error;
    }
    return { association };
  }

  async update({ user, association, label, description }: OwnerAction & { label: string; description: string }) {
    const selector = await this.#byOwner({ user, association }, "You cannot edit another user's definition.");
    const shown = displayLabel(label);
    const text = description.trim();
    if (!shown) throw new InvalidAssociation("Provide a word.");
    await this.#ready();
    try {
      const result = await this.associations.updateOne(selector, {
        $set: { label: shown, normalizedLabel: shown.toLowerCase(), description: text },
      });
      if (!result.matchedCount) throw new UnknownAssociation("This word could not be found.");
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new AssociationExists("You have already defined this word.");
      }
      throw error;
    }
    return {};
  }

  async setVisibility({ user, association, visibility }: OwnerAction & { visibility: AssociationVisibility }) {
    const selector = await this.#byOwner({ user, association }, "You cannot edit another user's definition.");
    const result = await this.associations.updateOne(selector, { $set: { visibility } });
    if (!result.matchedCount) throw new UnknownAssociation("This word could not be found.");
    return {};
  }

  async remove({ user, association }: OwnerAction) {
    const selector = await this.#byOwner({ user, association }, "You cannot remove another user's definition.");
    const result = await this.associations.deleteOne(selector);
    if (!result.deletedCount) throw new UnknownAssociation("This word could not be found.");
    return {};
  }

  async _byUser({ user }: { user: string }) {
    const rows = await this.associations.find({ user }).toArray();
    return rows
      .map(({ _id, label, description, visibility }) => ({ association: _id, label, description, visibility }))
      .sort(byLabel);
  }

  async _get({ association }: { association: string }) {
    const row = await this.associations.findOne({ _id: association });
    if (!row) return [];
    const { user, label, description, visibility } = row;
    return [{ user, label, description, visibility }];
  }

  async #byOwner({ user, association }: OwnerAction, notOwner: string) {
    const row = await this.associations.findOne({ _id: association }, { projection: { user: 1 } });
    if (!row) throw new UnknownAssociation("This word could not be found.");
    if (row.user !== user) throw new NotOwner(notOwner);
    return { _id: association, user };
  }
}
