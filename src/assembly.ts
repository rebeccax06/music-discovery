import { assemble } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";
import { applicationConceptSet } from "./concepts.ts";
import { UserAuthenticatingConcept } from "./concepts/UserAuthenticating.ts";
import { AnnotatingConcept } from "./concepts/Annotating.ts";
import { Pitching } from "./concepts/Pitching/registry.ts";
import { composition as Accounts } from "./compositions/Accounts.ts";

export function createInstances(db: Db) {
  return {
    UserAuthenticating: new UserAuthenticatingConcept(db),
    Annotating: new AnnotatingConcept(db),
    Pitching: new Pitching(db),
  };
}

export function assembleApplication(instances: ReturnType<typeof createInstances>) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances,
    composition: { Accounts },
    redaction: { fields: ["password", "session", "verifier"] },
  });
}
