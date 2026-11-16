# Concept Design — Sound It Out

## Design Overview

Sound It Out helps listeners communicate what they mean by subjective descriptions of music. A word such as "dreamy" is easy to share, but two listeners may associate it with very different sounds. A song link provides an example, yet does not explain which part of the song matters or why it fits.

The design separates six responsibilities:

| Concept | Responsibility |
|---|---|
| Associating | Preserve what a subjective label means to a particular person |
| Excerpting | Identify a reproducible portion of a media item |
| Annotating | Explain why an item illustrates or contrasts with a particular meaning |
| Suggesting | Let another person propose an item without changing the owner's collection |
| Appraising | Record a person's private judgment of how well an item fits |
| LinkSharing | Grant revocable access to a selected set of resources |

An **Association** is the central object displayed as a word on a Sound Wall. The wall itself is a view of the user's associations, not a separate concept with a second copy of their definitions.

An **Excerpt** identifies the sound someone wants another person to hear. An **Annotation** connects that excerpt to an association and explains its significance. A **Suggestion** holds a proposed excerpt separately until the association's owner reviews it. An **Appraisal** preserves the owner's assessment without automatically changing the association.

These distinctions allow two people to use the same label, even the same excerpt, without being forced to agree on what it means.

---

## 1. Associating

### Purpose

Give a person an editable, independent definition of a subjective label.

*Prevents:* One person's interpretation replacing another's; ambiguity about which definition belongs to whom; accidental duplication of the same label within one person's vocabulary.

### Principle

Alex defines "hype" as music with energetic percussion and a driving rhythm, but not necessarily loud vocals. A friend can independently define "hype" as fast electronic dance music.

Each person retains their own definition. Alex can revise the description as their understanding changes or remove the word when it is no longer useful. Changing Alex's definition never changes the friend's definition.

### Types

- `external User` — An opaque identity representing the person defining a label.

### State

A set of `Associations` with:

- `user: User`
- `label: String`
- `description: String`

**Invariant:** At most one association exists for each user and normalized label.

Labels are normalized for comparison by trimming surrounding whitespace, collapsing internal whitespace, and converting to lowercase. The displayed label preserves the user's chosen capitalization.

An association has a stable identity that does not change when its description is edited.

### Actions

**associate(user: User, label: String, description: String) : returns (association: Association)**

- Where the normalized label is empty or the trimmed description is empty:
  - Refuses `INVALID_ASSOCIATION`: "Provide a word and a description."
- Where an association already exists for the user and normalized label:
  - Refuses `ASSOCIATION_EXISTS`: "You have already defined this word."
- Otherwise:
  - Creates an association with the user, trimmed label, and trimmed description.
  - Returns the new association.

**update(user: User, association: Association, description: String) : returns ()**

- Where the association does not exist:
  - Refuses `UNKNOWN_ASSOCIATION`: "This word could not be found."
- Where the association belongs to a different user:
  - Refuses `NOT_OWNER`: "You cannot edit another user's definition."
- Where the trimmed description is empty:
  - Refuses `INVALID_DESCRIPTION`: "Provide a description."
- Otherwise:
  - Replaces the association's description with the trimmed description.
  - Returns.

**remove(user: User, association: Association) : returns ()**

- Where the association does not exist:
  - Refuses `UNKNOWN_ASSOCIATION`.
- Where the association belongs to a different user:
  - Refuses `NOT_OWNER`.
- Otherwise:
  - Removes the association.
  - Returns.

### Queries

**_byUser(user: User) : many (association: Association, label: String, description: String)**

Returns every association defined by the given user.

**_get(association: Association) : optional (user: User, label: String, description: String)**

Returns the association's owner and definition, or no result if the association does not exist.

### Notes

**Why the label is a string.** The label is user-authored text, so the concept must understand how to compare it. Representing it as an opaque external identity would leave the normalization rule unexplained.

**Why sharing is absent.** Associating determines what a label means, not who may see it. A definition remains private unless the application grants access to it through LinkSharing. This avoids storing separate visibility rules that might conflict with link permissions.

**Why examples are absent.** A definition can exist before any song has been attached. Associating does not need to know what counts as a musical example or whether an example is accepted.

---

## 2. Excerpting

### Purpose

Make a selected portion of a longer media item independently identifiable and reproducible.

*Prevents:* Listeners having to search through a full song to find the relevant moment; uncertainty about which section a contributor intended; two identical selections being treated as unrelated excerpts.

### Principle

Alex selects the interval from 42 to 57 seconds of a song because it contains the percussion that makes the song feel "hype." The excerpt identifies that interval without assigning it a meaning.

A friend may reference the same interval for an entirely different purpose. Selecting an already existing interval returns its existing identity, so examples can refer to the same sound without duplicating its definition.

An excerpt's boundaries do not change. Selecting a different interval produces a different excerpt.

### Types

- `external Track` — An opaque identity representing a media item supplied by an external catalog.

### State

A set of `Excerpts` with:

- `track: Track`
- `startMs: Number`
- `endMs: Number`

**Invariants:**

- `0 ≤ startMs < endMs`
- At most one excerpt exists for each `(track, startMs, endMs)` combination.

Time positions are measured in milliseconds.

### Actions

**select(track: Track, startMs: Number, endMs: Number) : returns (excerpt: Excerpt)**

- Where either position is non-finite, negative, or not a whole number, or `startMs ≥ endMs`:
  - Refuses `INVALID_RANGE`: "Select a valid portion of the track."
- Where an excerpt already exists for the same track and boundaries:
  - Returns the existing excerpt without changing state.
- Otherwise:
  - Creates an excerpt with the supplied track and boundaries.
  - Returns the new excerpt.

### Queries

**_get(excerpt: Excerpt) : optional (track: Track, startMs: Number, endMs: Number)**

Returns the track and interval represented by an excerpt, or no result if the excerpt does not exist.

### Notes

**Why excerpts are immutable.** A shared example should not silently change its sound because someone adjusts a waveform selector. Selecting another interval creates another identity. The user can then choose to replace the old example.

**Why musical meaning is absent.** The same excerpt may demonstrate rhythm in one context and vocal production in another. Excerpting identifies the sound; Annotating explains its significance.

**Playback boundary.** The application checks that the selected range falls within the actual track duration and that the music provider permits the requested playback. Excerpting does not store or distribute recordings. If arbitrary excerpt playback is not permitted, the application must use an authorized preview or source link rather than claim that the selected interval is playable.

**Deletion.** Excerpts have no owner-specific interpretation and may be referenced by multiple users. Removing a personal example therefore removes the reference to an excerpt, not the shared excerpt identity. Cleanup of unreferenced excerpts is an implementation concern rather than a user-facing action.

---

## 3. Annotating

### Purpose

Preserve an explanation of how an item relates to a particular context.

*Prevents:* Examples being presented without their intended meaning; the same item having an unexplained role in different contexts; private explanations becoming visible merely because their associated context was shared.

### Principle

Alex associates "hype" with energetic percussion. They attach an excerpt of a song with the note, "The drums build energy without the vocals becoming overwhelming."

Alex can also attach a counterexample: an excerpt with an intense vocal performance that does not represent their intended sound.

The item remains the same in both cases. The annotation records how it should be interpreted in this particular context. Alex can revise the explanation, change the item's role, or remove it without changing the item or other contexts where it appears.

### Types

- `external Author` — An opaque identity representing the person responsible for the annotation.
- `external Item` — An opaque identity representing the item being explained.
- `external Context` — An opaque identity representing the setting in which the explanation applies.

### State

`Role` is `EXAMPLE` or `COUNTEREXAMPLE`.

`Visibility` is `PRIVATE` or `SHARED`.

A set of `Annotations` with:

- `author: Author`
- `item: Item`
- `context: Context`
- `role: Role`
- `note: String`
- `visibility: Visibility`

**Invariant:** At most one annotation exists for each `(context, item)` pair.

New annotations are `PRIVATE`.

### Actions

**annotate(author: Author, item: Item, context: Context, role: Role, note: String) : returns (annotation: Annotation)**

- Where the trimmed note is empty:
  - Refuses `INVALID_NOTE`: "Explain why this example matters."
- Where an annotation already exists for the item and context:
  - Refuses `ANNOTATION_EXISTS`: "This item is already included here."
- Otherwise:
  - Creates an annotation with the supplied author, item, context, role, trimmed note, and `PRIVATE` visibility.
  - Returns the annotation.

**update(author: Author, annotation: Annotation, role: Role, note: String) : returns ()**

- Where the annotation does not exist:
  - Refuses `UNKNOWN_ANNOTATION`.
- Where the annotation belongs to another author:
  - Refuses `NOT_AUTHOR`.
- Where the trimmed note is empty:
  - Refuses `INVALID_NOTE`.
- Otherwise:
  - Updates the role and note.
  - Preserves the annotation's identity and visibility.
  - Returns.

**setVisibility(author: Author, annotation: Annotation, visibility: Visibility) : returns ()**

- Where the annotation does not exist:
  - Refuses `UNKNOWN_ANNOTATION`.
- Where the annotation belongs to another author:
  - Refuses `NOT_AUTHOR`.
- Otherwise:
  - Sets its visibility to the supplied value.
  - Returns.

**remove(author: Author, annotation: Annotation) : returns ()**

- Where the annotation does not exist:
  - Refuses `UNKNOWN_ANNOTATION`.
- Where the annotation belongs to another author:
  - Refuses `NOT_AUTHOR`.
- Otherwise:
  - Removes the annotation.
  - Returns.

**clearContext(context: Context) : returns ()**

- Removes all annotations for the supplied context.
- Returns.

### Queries

**_forContext(context: Context) : many (annotation: Annotation, author: Author, item: Item, role: Role, note: String, visibility: Visibility)**

Returns the annotations belonging to a particular context.

### Notes

**Examples and counterexamples.** A counterexample is an explanatory item with a contrasting role, not a rejected recommendation. Counterexamples help communicate distinctions without changing the meaning of the label itself.

**Private examples.** Sharing a context does not automatically publish every annotation. The author explicitly marks which annotations may be shown. This allows a listener to share a word without disclosing all the personal memories or explanations attached to it.

**Context cleanup.** `clearContext` is an internal composition action used when the containing context is deleted. The application does not expose it as an unrestricted public endpoint.

**Independent meaning.** Annotating does not know whether its context represents a musical word, a document, or another kind of resource. The application supplies the context and item identities.

---

## 4. Suggesting

### Purpose

Allow someone to propose an item for another person's consideration without modifying that person's accepted collection.

*Prevents:* Unapproved contributions changing the owner's collection; losing proposals before review; confusing a recommendation with an accepted example; repeatedly processing the same proposal.

### Principle

Daniel suggests an excerpt that might fit Alex's definition of "hype." He may include a brief reason, such as "The percussion has the energy you described."

The proposal remains pending until Alex decides whether to accept or decline it. Daniel can withdraw it while pending. Alex may respond with a short explanation, but the decision does not itself modify the accepted collection.

The proposal and its review remain identifiable, so the same excerpt is not repeatedly submitted as though it were new.

### Types

- `external User` — An opaque identity representing a participant.
- `external Context` — An opaque identity representing the collection receiving a proposal.
- `external Item` — An opaque identity representing a candidate item.

### State

`Status` is `PENDING`, `ACCEPTED`, or `DECLINED`.

`Decision` is `ACCEPTED` or `DECLINED`.

A set of `Suggestions` with:

- `contributor: User`
- `recipient: User`
- `context: Context`
- `item: Item`
- `reason: String`
- `status: Status`
- `response: String`

**Invariant:** At most one suggestion exists for each `(context, item)` pair.

New suggestions have status `PENDING` and an empty response.

### Actions

**suggest(contributor: User, recipient: User, context: Context, item: Item, reason: String) : returns (suggestion: Suggestion)**

- Where contributor and recipient are the same:
  - Refuses `SELF_SUGGESTION`: "Add this item directly instead."
- Where a suggestion already exists for the same context and item:
  - Refuses `ALREADY_SUGGESTED`: "This item has already been suggested here."
- Otherwise:
  - Creates a suggestion with the contributor, recipient, context, item, trimmed reason, `PENDING` status, and empty response.
  - Returns the suggestion.

**withdraw(contributor: User, suggestion: Suggestion) : returns ()**

- Where the suggestion does not exist:
  - Refuses `UNKNOWN_SUGGESTION`.
- Where the contributor does not own the suggestion:
  - Refuses `NOT_CONTRIBUTOR`.
- Where the suggestion has already been reviewed:
  - Refuses `ALREADY_REVIEWED`.
- Otherwise:
  - Removes the pending suggestion.
  - Returns.

**review(recipient: User, suggestion: Suggestion, decision: Decision, response: String) : returns (context: Context, item: Item)**

- Where the suggestion does not exist:
  - Refuses `UNKNOWN_SUGGESTION`.
- Where the recipient does not match the stored recipient:
  - Refuses `NOT_RECIPIENT`.
- Where the suggestion is not `PENDING`:
  - Refuses `ALREADY_REVIEWED`.
- Otherwise:
  - Sets the status to the decision.
  - Saves the trimmed response.
  - Returns the context and item.

**clearContext(context: Context) : returns ()**

- Removes all suggestions belonging to the supplied context, including previously reviewed suggestions.
- Returns.

### Queries

**_forContext(context: Context) : many (suggestion: Suggestion, contributor: User, recipient: User, item: Item, reason: String, status: Status, response: String)**

Returns the proposals associated with a context.

**_byContributor(contributor: User) : many (suggestion: Suggestion, context: Context, item: Item, status: Status, response: String)**

Returns the contributor's proposals and their review outcomes.

### Notes

**Acceptance is not evaluation.** A song can fit the listener's description but still be unsuitable for inclusion, perhaps because it is already familiar. Suggesting records the owner's decision about the proposal. Appraising separately records the owner's judgment of musical fit.

**A proposal is not an accepted annotation.** Daniel's explanation stays with his proposal. If Alex accepts the song, Alex authors the explanation that will accompany it on their own wall. The application may offer Daniel's reason as editable starting text, but does not publish it as Alex's judgment without approval.

**Response visibility.** A response is optional and visible only to the contributor and recipient. There are no public rejection counts or contributor rankings.

**Permission to suggest.** The application checks whether a contributor may submit to the context before invoking `suggest`. A readable sharing link does not, by itself, grant permission to propose items. Contributor restrictions, rate limits, and reporting are application policies rather than behavior hidden inside the concept.

**Context cleanup.** `clearContext` supports deletion of a collection without leaving proposals that refer to it.

---

## 5. Appraising

### Purpose

Preserve a person's private and revisable assessment of how well an item satisfies particular criteria.

*Prevents:* Losing the reason for a judgment; recording contradictory evaluations as separate assessments; making subjective judgments public by default; treating acceptance as proof of fit.

### Principle

Alex evaluates Daniel's proposed excerpt against Alex's definition of "hype."

The excerpt might be a `PARTIAL` match because its drums are energetic but its vocals are too prominent. Alex records that distinction privately. If Alex later changes their mind, they replace the evaluation rather than create another conflicting record.

The assessment does not accept a proposal, modify a definition, or alter anyone else's evaluation.

### Types

- `external Evaluator` — An opaque identity representing the person making a judgment.
- `external Target` — An opaque identity representing the criteria against which an item is evaluated.
- `external Item` — An opaque identity representing the item being assessed.

### State

`Fit` is `MATCH`, `PARTIAL`, or `MISS`.

A set of `Appraisals` with:

- `evaluator: Evaluator`
- `target: Target`
- `item: Item`
- `fit: Fit`
- `note: String`

**Invariant:** At most one appraisal exists for each `(evaluator, target, item)` combination.

### Actions

**appraise(evaluator: Evaluator, target: Target, item: Item, fit: Fit, note: String) : returns ()**

- Where an appraisal already exists for the same evaluator, target, and item:
  - Replaces its fit and note with the new fit and trimmed note.
  - Returns.
- Otherwise:
  - Creates a new appraisal with the supplied values.
  - Returns.

**clear(evaluator: Evaluator, target: Target, item: Item) : returns ()**

- Where no corresponding appraisal exists:
  - Refuses `NOT_APPRAISED`: "No appraisal exists for this item."
- Otherwise:
  - Removes the appraisal.
  - Returns.

**clearTarget(target: Target) : returns ()**

- Removes all appraisals associated with the supplied target.
- Returns.

### Queries

**_forTarget(evaluator: Evaluator, target: Target) : many (item: Item, fit: Fit, note: String)**

Returns the evaluator's assessments of items against the target.

### Notes

**Fit is not approval.** A `MATCH` does not automatically accept a suggestion, and a `MISS` does not automatically reject it. Appraising represents a judgment about criteria, while Suggesting represents a decision about incorporating a proposal.

**Private by design.** Appraisals are never included in a public Sound Wall or returned by resolving a sharing link. Their notes can describe preferences or personal associations that the evaluator does not want to disclose.

**One current judgment.** Reappraising replaces an earlier assessment. This reflects the listener's current interpretation without requiring a permanent public history of changing opinions.

**Target cleanup.** `clearTarget` is an internal action used when the evaluated target is removed.

---

## 6. LinkSharing

### Purpose

Give recipients revocable, read-only access to a selected collection of resources without requiring recipient authentication.

*Prevents:* Publishing an entire collection merely to share one item; accidental disclosure of unrelated resources; permanent access through an obsolete link; treating possession of a link as permission to edit.

### Principle

Alex selects one or more resources and generates an unguessable link granting access to exactly that selection.

Daniel can open the link without creating an account. The link may represent one word or several words that Alex chooses to share together.

Alex can revoke the link. Creating another link produces a different token, so revoking one link does not invalidate unrelated shares.

A link's resource selection is fixed when the link is created. Sharing new material requires a new grant rather than silently expanding the audience's access.

### Types

- `external Owner` — An opaque identity representing the person authorizing access.
- `external Resource` — An opaque identity representing an object that can be shared.

### State

A set of `Links` with:

- `owner: Owner`
- `resources: Set<Resource>`
- `token: String`

**Invariants:**

- Every token is unique and generated using a cryptographically secure random source.
- Every active link contains at least one resource.
- A link's resource selection cannot be expanded after creation.

Different links may contain overlapping resources.

### Actions

**generate(owner: Owner, resources: Set<Resource>) : returns (link: Link, token: String)**

- Where resources is empty:
  - Refuses `EMPTY_SHARE`: "Select something to share."
- Otherwise:
  - Generates a fresh, unguessable token.
  - Creates a link with the supplied owner and selected resources.
  - Returns the link and token.

**revoke(owner: Owner, link: Link) : returns ()**

- Where the link does not exist:
  - Refuses `UNKNOWN_LINK`.
- Where the link belongs to another owner:
  - Refuses `NOT_OWNER`.
- Otherwise:
  - Removes the link.
  - Returns.

**forget(resource: Resource) : returns ()**

- Removes the supplied resource from every link containing it.
- Removes any link left with an empty resource set.
- Preserves links that still contain other resources.
- Returns.

### Queries

**_resolve(token: String) : optional (resources: Set<Resource>)**

Returns the resources accessible through a valid token, or no result if the token is unknown or revoked.

**_byOwner(owner: Owner) : many (link: Link, resources: Set<Resource>)**

Returns the owner's active sharing links and their resource selections.

### Notes

**Scoped sharing instead of public profiles.** The application can share one association or a selected set of associations using the same concept. A user's entire vocabulary does not become public merely because one word is shared.

**Sharing does not publish every example.** When a shared association is displayed, the application includes only annotations explicitly marked `SHARED`. Private annotations and all appraisals remain hidden.

**No editing authority.** Resolving a link grants read access only. Changing definitions, approving suggestions, or altering annotations requires independent authorization.

**Immutable selection.** An existing link reflects edits to the resources it references, but does not gain access to newly selected resources. Alex can revoke an outdated link and generate another containing a different set of associations.

**Ownership verification.** LinkSharing treats resource identities as opaque. Before generating a link, the application verifies that the owner is authorized to share every selected resource.

**Deletion.** `forget` is an internal cleanup operation. It prevents deleted resources from remaining in active grants without requiring the LinkSharing concept to understand their meaning.

**Limits of revocation.** Revocation prevents future resolution of a token. It cannot retract information that a recipient has already copied.

---

# Concept Composition

## Type Bindings

The concepts do not import or inspect one another's state. The application connects their generic identities as follows:

| Application object | Concept identities |
|---|---|
| A listener | Associating.User, Suggesting.User, Appraising.Evaluator, LinkSharing.Owner, Annotating.Author |
| A personal word | Associating.Association, Annotating.Context, Suggesting.Context, Appraising.Target, LinkSharing.Resource |
| A selected sound | Excerpting.Excerpt, Annotating.Item, Suggesting.Item, Appraising.Item |
| A song | Excerpting.Track |
| A shared selection | A set of LinkSharing.Resource identities |

These bindings are defined by Sound It Out, not by the individual concepts. For example, Annotating works with an arbitrary `Context`, even though Sound It Out supplies an Association as that context.

This is the main composition: **an excerpt has a stable identity, while its meaning is supplied by the association and annotation in which it appears.** The same excerpt can support different interpretations without duplicating audio or forcing agreement between users.

## Application Authorization

The application derives the acting user from the authenticated session. A client cannot authorize an action simply by supplying another user's identity.

Before calling a concept action, the application checks the relationships the concept cannot know:

- Only an association's owner may add accepted examples to it or review suggestions addressed to it.
- Only that owner may grant access to the association.
- Only authorized contributors may submit suggestions.
- A shared-link recipient may view the granted associations, but cannot modify them.
- Public reads include only explicitly shared annotations; private appraisals are never included.

The concept actions also enforce their own local ownership rules where that information is part of their state. These two boundaries complement one another: application authorization checks cross-concept relationships, while concept actions preserve their local invariants.

## Essential Reactions

The following reactions describe the relationships between concepts. Each linkage has one triggering occurrence and one resulting concept action. Multi-part user operations are expressed as separate linkages rather than imperative scripts.

Request context carries the authorized user, target association, and user-provided explanations. Each returned excerpt or proposal is correlated with the request that created it, preventing unrelated concurrent operations from being combined.

### R1 — A selected excerpt becomes an example

**When:** `Excerpting.select(track, startMs, endMs)` returns excerpt `e` in an authorized `AddExample` request for association `a`, with role `r` and note `n`.

**Then:** `Annotating.annotate(user, e, a, r, n)`.

**Effect:** The selected sound becomes evidence for the listener's definition.

**Notes:** The association must belong to the acting user. The resulting annotation is private by default. The user may later mark it shared. If the excerpt already has an annotation in this context, the app must direct the user to revise that annotation rather than create a duplicate.

### R2 — A selected excerpt becomes a proposal

**When:** `Excerpting.select(track, startMs, endMs)` returns excerpt `e` in an authorized `ProposeExample` request addressed to association `a`, owned by recipient `u`, with contributor `c` and reason `n`.

**Then:** `Suggesting.suggest(c, u, a, e, n)`.

**Effect:** A friend can propose a sound without changing the listener's accepted examples.

**Notes:** This is distinct from R1. The request's purpose determines whether a selected excerpt becomes the owner's annotation or a contributor's pending suggestion. Both reactions reuse Excerpting without requiring it to know either application workflow.

### R3 — Accepting a proposal creates an accepted example

**When:** `Suggesting.review(owner, suggestion, ACCEPTED, response)` returns context `a` and item `e`, in an authorized review request containing the owner's public example note `n`.

**Then:** `Annotating.annotate(owner, e, a, EXAMPLE, n)`, provided no annotation already exists for `(a, e)`.

**Effect:** An accepted suggestion becomes part of the owner's personal explanation.

**Notes:** Acceptance requires the owner to confirm the explanation that will appear on their wall. The contributor's original reason can be offered as editable starting text, but is not automatically attributed to the owner. A declined suggestion does not trigger an annotation.

The application must guard against duplicate annotations and coordinate the review and annotation so that a failed addition does not leave an inconsistent accepted state.

### R4 — Recording fit is independent of reviewing a proposal

**When:** An authorized evaluation request supplies evaluator `u`, target association `a`, excerpt `e`, fit `f`, and private note `n`.

**Then:** `Appraising.appraise(u, a, e, f, n)`.

**Effect:** The listener can record what matched or missed their definition without making an acceptance decision.

**Notes:** The evaluation may accompany a review request, but it is a separate linkage. No reaction automatically converts `MATCH` into `ACCEPTED`, or `MISS` into `DECLINED`.

### R5 — Removing a definition removes its explanations

**When:** `Associating.remove(user, association)` succeeds for association `a`.

**Then:** `Annotating.clearContext(a)`.

**Effect:** Examples and counterexamples do not remain attached to a definition that no longer exists.

### R6 — Removing a definition clears its proposals

**When:** `Associating.remove(user, association)` succeeds for association `a`.

**Then:** `Suggesting.clearContext(a)`.

**Effect:** Pending and reviewed proposals cannot continue to target a removed definition.

### R7 — Removing a definition clears its appraisals

**When:** `Associating.remove(user, association)` succeeds for association `a`.

**Then:** `Appraising.clearTarget(a)`.

**Effect:** Private evaluations of an obsolete definition are removed without affecting evaluations of other definitions.

### R8 — Removing a definition updates sharing links

**When:** `Associating.remove(user, association)` succeeds for association `a`.

**Then:** `LinkSharing.forget(a)`.

**Effect:** A deleted word is no longer accessible through an existing link. Links containing other words remain usable for those words.

**Notes for R5–R8:** These are four independent linkages from the same event. None of the concepts needs to call another concept directly or understand why the association was deleted. The implementation must coordinate cleanup and make repeated cleanup safe.

## Application Views

The user interface assembles current state without storing a second copy of the same information.

### Personal Sound Wall

For the authenticated user:

1. Retrieve the user's associations through `Associating._byUser`.
2. For each association, retrieve its annotations through `Annotating._forContext`.
3. Resolve each annotated excerpt using `Excerpting._get`.
4. Display definitions, playable authorized examples, and counterexamples.
5. Show the owner's pending suggestions and private appraisals in their respective interfaces.

This is a read composition. It does not create a separate Sound Wall concept.

### Shared Sound Wall

For a recipient opening a token:

1. Resolve the selected association identities through `LinkSharing._resolve`.
2. Retrieve their definitions and annotations.
3. Include only annotations marked `SHARED`.
4. Display authorized audio playback or source links, with artist and track attribution.

Private appraisals, unshared annotations, and unrelated associations are excluded. A single-association link and a multi-association wall link use the same view rules.

### Suggestion Review

For the association's owner, display each pending suggestion beside the definition it targets. The contributor's reason explains why the item was proposed; any appraisal belongs to the owner's private evaluation. Accepting a proposal requires a separate decision about what explanation to add to the accepted collection.

---

# Composition Walkthrough

Alex wants to explain "hype" to a friend. They create an association with the description, "Fast, driving percussion without overpowering vocals." The association belongs to Alex alone.

Alex selects a short interval of a familiar song and attaches it as an example with the explanation, "The rhythm builds energy while the vocals stay in the background." They also add a contrasting excerpt whose loud vocals demonstrate what they do not want.

To share the explanation, Alex selects the association and marks its intended examples `SHARED`. LinkSharing generates a link containing that association. Their friend opens it and hears the authorized examples alongside Alex's descriptions, without being required to create a Sound Wall.

The friend proposes an unfamiliar excerpt, explaining, "The drums have the same momentum." Suggesting records the proposal as pending; Alex's accepted examples remain unchanged.

Alex listens and privately appraises the excerpt as `PARTIAL`, noting that the rhythm fits but the vocals are too prominent. Alex declines the proposal and optionally replies, "Close on the drums, but not quite the vocal style."

Later, another suggestion fits. Alex accepts it and confirms the explanation to add to the wall. The accepted excerpt becomes an annotation of Alex's association. Alex may also revise the definition if the exchange helped them identify something more precise.

When Alex shares the word with someone else, the current definition and deliberately shared examples provide reusable context. They do not need to reconstruct the earlier conversation. The original problem is reduced because the explanation remains attached to the word and can be updated by its owner.

---

# Remaining Design Decisions

**Playback availability.** Excerpting represents a selected interval, but actual playback depends on the music provider. The implementation must validate track duration and permitted preview ranges. If arbitrary excerpts are unavailable, the initial release will use authorized previews or links and explain that limitation.

**Suggestion participation.** Read-only sharing works without an account. For the first implementation, contributors may need to authenticate before submitting suggestions, although they do not need to create Sound Walls. Anonymous, token-authorized contributions would require a separate policy for identifying and restricting contributors.

**Abuse prevention.** The design separates read access from permission to suggest, but rate limits, blocking, reporting, and content moderation still need implementation decisions. The first release should not expose unrestricted anonymous suggestion endpoints.

**Guest-to-account transition.** Alex's journey begins with browsing before account creation. The team must decide whether unsaved guest edits are preserved when an account is created. This is not behavior provided by the six domain concepts.

**Automated recommendations.** The core design supports person-to-person recommendations. A future recommendation model could produce candidates for the same review process without being allowed to edit personal definitions automatically. Model generation and ranking are outside the initial concept design.

**Consistency across reactions.** Cross-concept updates must be guarded against duplicate requests and partial failures. In particular, accepting a proposal must not leave an accepted status without the intended annotation. Cleanup following deletion must eventually complete across all related concepts.

The initial release should prioritize creating one definition, attaching an example, sharing it, receiving a suggestion, and deciding whether to incorporate it. These interactions directly address the difficulty identified in the problem framing. More elaborate recommendation or social features are justified only if that small workflow proves useful.

---

# Design Rationale

The principal design choice is to separate **the sound, the interpretation, and the social decision**.

Excerpting identifies a reproducible sound without attaching a universal meaning. Associating gives the listener ownership of a subjective definition. Annotating explains why an excerpt matters to that definition. Suggesting allows another person to contribute without changing it. Appraising records the listener's judgment without turning taste into a public score. LinkSharing lets the listener choose what to disclose without making their full vocabulary public.

This decomposition makes an important difficulty simpler: the same word and song can participate in different interpretations without any concept having to decide which interpretation is correct.

The application coordinates these independent behaviors, but the listener remains the authority over the meaning they communicate. That is what allows Sound It Out to preserve an explanation across conversations while still letting it change as the listener's taste evolves.