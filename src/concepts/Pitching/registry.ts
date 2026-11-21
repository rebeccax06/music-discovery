import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Pitching.md" with { type: "text" };
import type { Db } from "mongodb";
import {
  AlreadyPitched,
  AlreadyReviewed,
  InvalidReview,
  NotContributor,
  NotReviewed,
  PitchingConcept,
  PitchNotFound,
} from "./Pitching.ts";

export class Pitching extends PitchingConcept<string, string, string> {}

export const pitching = registerConcept({
  class: Pitching ,
  spec,
  refusals: {
    PITCH_NOT_FOUND: PitchNotFound,
    ALREADY_PITCHED: AlreadyPitched,
    NOT_CONTRIBUTOR: NotContributor,
    ALREADY_REVIEWED: AlreadyReviewed,
    INVALID_REVIEW: InvalidReview,
    NOT_REVIEWED: NotReviewed,
  },
  floors: {
    mongo: ({ database }: { database: Db }, name: string) => new Pitching (database, name),
  },
});
