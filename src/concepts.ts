import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import authenticatingSpec from "@design/concepts/UserAuthenticating.md" with { type: "text" };
import {
  InvalidCredentials, InvalidPassword, InvalidUsername, UnknownSession,
  UserAuthenticatingConcept, UsernameTaken,
} from "./concepts/UserAuthenticating.ts";

const authenticating = registerConcept({
  class: UserAuthenticatingConcept,
  spec: authenticatingSpec,
  refusals: {
    INVALID_USERNAME: InvalidUsername,
    INVALID_PASSWORD: InvalidPassword,
    USERNAME_TAKEN: UsernameTaken,
    INVALID_CREDENTIALS: InvalidCredentials,
    UNKNOWN_SESSION: UnknownSession,
  },
});

export const applicationConceptSet = conceptSet({ UserAuthenticating: authenticating });
export const { concepts } = applicationConceptSet;
