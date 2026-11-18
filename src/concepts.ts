import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import authenticatingSpec from "@design/concepts/UserAuthenticating.md" with { type: "text" };
import annotatingSpec from "@design/concepts/Annotating.md" with { type: "text" };
import {
  InvalidCredentials, InvalidPassword, InvalidUsername, UnknownSession,
  UserAuthenticatingConcept, UsernameTaken,
} from "./concepts/UserAuthenticating.ts";
import { AnnotatingConcept, AnnotationExists, InvalidNote, NotAuthor, UnknownAnnotation } from "./concepts/Annotating.ts";

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

const annotating = registerConcept({
  class: AnnotatingConcept,
  spec: annotatingSpec,
  refusals: {
    INVALID_NOTE: InvalidNote,
    ANNOTATION_EXISTS: AnnotationExists,
    UNKNOWN_ANNOTATION: UnknownAnnotation,
    NOT_AUTHOR: NotAuthor,
  },
});

export const applicationConceptSet = conceptSet({ UserAuthenticating: authenticating, Annotating: annotating });
export const { concepts } = applicationConceptSet;
