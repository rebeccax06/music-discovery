import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import authenticatingSpec from "@design/concepts/Authenticating.md" with { type: "text" };
import registeringSpec from "@design/concepts/Registering.md" with { type: "text" };
import sessioningSpec from "@design/concepts/Sessioning.md" with { type: "text" };
import annotatingSpec from "@design/concepts/Annotating.md" with { type: "text" };
import associatingSpec from "@design/concepts/Associating.md" with { type: "text" };
import { AuthenticatingConcept, InvalidCredentials, InvalidPassword, PasswordSet } from "./concepts/Authenticating.ts";
import { InvalidUsername, RegisteringConcept, UsernameTaken } from "./concepts/Registering.ts";
import { NotSignedIn, SessionEnded, SessioningConcept } from "./concepts/Sessioning.ts";
import friendingSpec from "@design/concepts/Friending.md" with { type: "text" };
import pitchingSpec from "@design/concepts/Pitching.md" with { type: "text" };
import { AnnotatingConcept, AnnotationExists, NotAuthor, UnknownAnnotation } from "./concepts/Annotating.ts";
import {
  AssociatingConcept, AssociationExists, InvalidAssociation, NotOwner, UnknownAssociation,
} from "./concepts/Associating.ts";
import {
  AlreadyFriends, FriendingConcept, NoRequest, NotFriends, RequestExists, RequestWaiting, SelfRequest,
} from "./concepts/Friending.ts";
import {
  AlreadyPitched, AlreadyReviewed, InvalidReview, NotContributor, NotRecipient, PitchingConcept, SelfPitch, UnknownPitch,
} from "./concepts/Pitching.ts";

const registering = registerConcept({
  class: RegisteringConcept,
  spec: registeringSpec,
  refusals: {
    INVALID_USERNAME: InvalidUsername,
    USERNAME_TAKEN: UsernameTaken,
  },
});

const authenticating = registerConcept({
  class: AuthenticatingConcept,
  spec: authenticatingSpec,
  refusals: {
    INVALID_PASSWORD: InvalidPassword,
    PASSWORD_SET: PasswordSet,
    INVALID_CREDENTIALS: InvalidCredentials,
  },
});

const sessioning = registerConcept({
  class: SessioningConcept,
  spec: sessioningSpec,
  refusals: {
    NOT_SIGNED_IN: NotSignedIn,
    SESSION_ENDED: SessionEnded,
  },
});

const associating = registerConcept({
  class: AssociatingConcept,
  spec: associatingSpec,
  refusals: {
    INVALID_ASSOCIATION: InvalidAssociation,
    ASSOCIATION_EXISTS: AssociationExists,
    UNKNOWN_ASSOCIATION: UnknownAssociation,
    NOT_OWNER: NotOwner,
  },
});

const annotating = registerConcept({
  class: AnnotatingConcept,
  spec: annotatingSpec,
  refusals: {
    ANNOTATION_EXISTS: AnnotationExists,
    UNKNOWN_ANNOTATION: UnknownAnnotation,
    NOT_AUTHOR: NotAuthor,
  },
});

const pitching = registerConcept({
  class: PitchingConcept,
  spec: pitchingSpec,
  refusals: {
    SELF_PITCH: SelfPitch,
    ALREADY_PITCHED: AlreadyPitched,
    UNKNOWN_PITCH: UnknownPitch,
    NOT_CONTRIBUTOR: NotContributor,
    NOT_RECIPIENT: NotRecipient,
    ALREADY_REVIEWED: AlreadyReviewed,
    INVALID_REVIEW: InvalidReview,
  },
});

const friending = registerConcept({
  class: FriendingConcept,
  spec: friendingSpec,
  refusals: {
    SELF_REQUEST: SelfRequest,
    ALREADY_FRIENDS: AlreadyFriends,
    REQUEST_WAITING: RequestWaiting,
    REQUEST_EXISTS: RequestExists,
    NO_REQUEST: NoRequest,
    NOT_FRIENDS: NotFriends,
  },
});

/**
 * The instant at which the current request is handled. Each flow that starts, uses, or ends a
 * session binds it once and passes it to Sessioning, so Sessioning never reads a clock.
 */
function currentInstant(_input: Record<string, never>): Date {
  return new Date();
}

export const applicationConceptSet = conceptSet({
  Registering: registering,
  Authenticating: authenticating,
  Sessioning: sessioning,
  Associating: associating,
  Annotating: annotating,
  Pitching: pitching,
  Friending: friending,
}, { currentInstant });
export const { concepts, computations } = applicationConceptSet;
