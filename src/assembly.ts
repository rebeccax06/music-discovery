import { assemble } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";
import { applicationConceptSet } from "./concepts.ts";
import { UserAuthenticatingConcept } from "./concepts/UserAuthenticating.ts";
import { AssociatingConcept } from "./concepts/Associating.ts";
import { AnnotatingConcept } from "./concepts/Annotating.ts";
import { PitchingConcept } from "./concepts/Pitching.ts";
import { FriendingConcept } from "./concepts/Friending.ts";
import { composition as Accounts } from "./compositions/Accounts.ts";
import { composition as SoundWall } from "./compositions/SoundWall.ts";
import { composition as Suggestions } from "./compositions/Suggestions.ts";
import { composition as Friends } from "./compositions/Friends.ts";

export function createInstances(db: Db) {
  return {
    UserAuthenticating: new UserAuthenticatingConcept(db),
    Associating: new AssociatingConcept(db),
    Annotating: new AnnotatingConcept(db),
    Pitching: new PitchingConcept(db),
    Friending: new FriendingConcept(db),
  };
}

export function assembleApplication(instances: ReturnType<typeof createInstances>) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances,
    composition: { Accounts, SoundWall, Suggestions, Friends },
    redaction: { fields: ["password", "session", "verifier"] },
  });
}
