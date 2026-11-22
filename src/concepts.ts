import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import authenticatingSpec from "@design/concepts/UserAuthenticating.md" with { type: "text" };
import annotatingSpec from "@design/concepts/Annotating.md" with { type: "text" };
import associatingSpec from "@design/concepts/Associating.md" with { type: "text" };
import {
  InvalidCredentials, InvalidPassword, InvalidUsername, UnknownSession,
  UserAuthenticatingConcept, UsernameTaken,
} from "./concepts/UserAuthenticating.ts";
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

export const applicationConceptSet = conceptSet({
  UserAuthenticating: authenticating,
  Associating: associating,
  Annotating: annotating,
  Pitching: pitching,
  Friending: friending,
});
export const { concepts } = applicationConceptSet;
