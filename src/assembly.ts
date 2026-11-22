import { assemble } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";
import { applicationConceptSet } from "./concepts.ts";
import { UserAuthenticatingConcept } from "./concepts/UserAuthenticating.ts";
import { AssociatingConcept } from "./concepts/Associating.ts";
import { AnnotatingConcept } from "./concepts/Annotating.ts";
import { composition as Accounts } from "./compositions/Accounts.ts";
import { composition as SoundWall } from "./compositions/SoundWall.ts";
import { composition as Examples } from "./compositions/Examples.ts";

export function createInstances(db: Db) {
  return {
    UserAuthenticating: new UserAuthenticatingConcept(db),
    Associating: new AssociatingConcept(db),
    Annotating: new AnnotatingConcept(db),
  };
}

export function assembleApplication(instances: ReturnType<typeof createInstances>) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances,
    composition: { Accounts, SoundWall, Examples },
    redaction: { fields: ["password", "session", "verifier"] },
  });
}
