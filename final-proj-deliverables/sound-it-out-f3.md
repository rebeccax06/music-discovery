# Problem Framing

[Link to revised F2 Problem Framing document](f2.md)

# Concept Design

## Associating

### Purpose

Give a person an editable, independent definition of a subjective label.
*Prevents:* One person's interpretation replacing another's; ambiguity about which definition belongs to whom; accidental duplication of the same label within one person's vocabulary.

### Principle

Alex defines "hype" as music with energetic percussion and a driving rhythm, but not necessarily loud vocals. A friend can independently define "hype" as fast electronic dance music. Each person retains their own definition. Alex can revise the description as their understanding changes or remove the word when it is no longer useful. Changing Alex's definition never changes the friend's definition.

### Types

```types
external User
  An opaque identity representing the person defining a label.
```

### State

```state
Visibility is PRIVATE or PUBLIC

a set of Associations with
  a user User
  a label String
  a description String
  a visibility Visibility
  unique user and label

Rule: Labels are normalized for comparison by trimming surrounding whitespace, collapsing internal whitespace, and converting to lowercase. The displayed label preserves the user's chosen capitalization.
Rule: An association has a stable identity that does not change when its description is edited.
```

### Actions

```actions
associate(user: User, label: String, description: String, visibility: Visibility) : returns (association: Association)
  where the normalized label is empty or the trimmed description is empty
  then
    refuses INVALID_ASSOCIATION "Provide a word and a description."
  where an association already exists for the user and normalized label
  then
    refuses ASSOCIATION_EXISTS "You have already defined this word."
  where the normalized label and trimmed description are not empty and no association exists
  then
    create an association with the user, trimmed label, trimmed description, and visibility
    returns the new association

update(user: User, association: Association, description: String) : returns ()
  where the association does not exist
  then
    refuses UNKNOWN_ASSOCIATION "This word could not be found."
  where the association belongs to a different user
  then
    refuses NOT_OWNER "You cannot edit another user's definition."
  where the trimmed description is empty
  then
    refuses INVALID_DESCRIPTION "Provide a description."
  where the association exists, belongs to the user, and the description is valid
  then
    replace the association's description with the trimmed description
    returns

setVisibility(user: User, association: Association, visibility: Visibility) : returns ()
  where the association does not exist
  then
    refuses UNKNOWN_ASSOCIATION "This word could not be found."
  where the association belongs to a different user
  then
    refuses NOT_OWNER "You cannot edit another user's definition."
  where the association exists and belongs to the user
  then
    set its visibility to the supplied value
    returns

remove(user: User, association: Association) : returns ()
  where the association does not exist
  then
    refuses UNKNOWN_ASSOCIATION "This word could not be found."
  where the association belongs to a different user
  then
    refuses NOT_OWNER "You cannot remove another user's definition."
  where the association exists and belongs to the user
  then
    remove the association
    returns
```

### Queries

```queries
_byUser(user: User) : many (association: Association, label: String, description: String, visibility: Visibility)
  Returns every association defined by the given user.

_get(association: Association) : optional (user: User, label: String, description: String, visibility: Visibility)
  Returns the association's owner and definition, or no result if the association does not exist.
```

## Excerpting

### Purpose

Make a selected portion of a longer media item independently identifiable and reproducible.
*Prevents:* Listeners having to search through a full song to find the relevant moment; uncertainty about which section a contributor intended; two identical selections being treated as unrelated excerpts.

### Principle

Alex selects the interval from 42 to 57 seconds of a song because it contains the percussion that makes the song feel "hype." The excerpt identifies that interval without assigning it a meaning. A friend may reference the same interval for an entirely different purpose. Selecting an already existing interval returns its existing identity, so examples can refer to the same sound without duplicating its definition.

### Types

```types
external Track
  An opaque identity representing a media item supplied by an external catalog.
```

### State

```state
a set of Excerpts with
  a track Track
  a startMs Number
  a endMs Number
  unique track and startMs and endMs

Rule: 0 <= startMs < endMs
Rule: Time positions are measured in milliseconds.
```

### Actions

```actions
select(track: Track, startMs: Number, endMs: Number) : returns (excerpt: Excerpt)
  where either position is non-finite, negative, or not a whole number, or startMs >= endMs
  then
    refuses INVALID_RANGE "Select a valid portion of the track."
  where an excerpt already exists for the same track and boundaries
  then
    returns the existing excerpt without changing state
  where the range is valid and no excerpt exists for the track and boundaries
  then
    create an excerpt with the supplied track and boundaries
    returns the new excerpt
```

### Queries

```queries
_get(excerpt: Excerpt) : optional (track: Track, startMs: Number, endMs: Number)
  Returns the track and interval represented by an excerpt, or no result if the excerpt does not exist.
```

## Annotating

### Purpose

Preserve an explanation of how an item relates to a particular context.
*Prevents:* Examples being presented without their intended meaning; the same item having an unexplained role in different contexts; private explanations becoming visible merely because their associated context was shared.

### Principle

Alex associates "hype" with energetic percussion. They attach an excerpt of a song with the note, "The drums build energy without the vocals becoming overwhelming." Alex can also attach a counterexample. The item remains the same in both cases. The annotation records how it should be interpreted in this particular context. Alex can revise the explanation, change the item's role, or remove it.

### Types

```types
external Author
  An opaque identity representing the person responsible for the annotation.
external Item
  An opaque identity representing the item being explained.
external Context
  An opaque identity representing the setting in which the explanation applies.
```

### State

```state
Role is EXAMPLE or COUNTEREXAMPLE
Visibility is PRIVATE or SHARED

a set of Annotations with
  an author Author
  an item Item
  a context Context
  a role Role
  a note String
  a visibility Visibility
  unique context and item

Rule: New annotations are PRIVATE.
```

### Actions

```actions
annotate(author: Author, item: Item, context: Context, role: Role, note: String) : returns (annotation: Annotation)
  where the trimmed note is empty
  then
    refuses INVALID_NOTE "Explain why this example matters."
  where an annotation already exists for the item and context
  then
    refuses ANNOTATION_EXISTS "This item is already included here."
  where the note is valid and no annotation exists for the item and context
  then
    create an annotation with the supplied author, item, context, role, trimmed note, and PRIVATE visibility
    returns the annotation

update(author: Author, annotation: Annotation, role: Role, note: String) : returns ()
  where the annotation does not exist
  then
    refuses UNKNOWN_ANNOTATION "This annotation could not be found."
  where the annotation belongs to another author
  then
    refuses NOT_AUTHOR "You cannot edit another user's annotation."
  where the trimmed note is empty
  then
    refuses INVALID_NOTE "Explain why this example matters."
  where the annotation exists, belongs to the author, and the note is valid
  then
    update the role and note, preserving the annotation's identity and visibility
    returns

setVisibility(author: Author, annotation: Annotation, visibility: Visibility) : returns ()
  where the annotation does not exist
  then
    refuses UNKNOWN_ANNOTATION "This annotation could not be found."
  where the annotation belongs to another author
  then
    refuses NOT_AUTHOR "You cannot edit another user's annotation."
  where the annotation exists and belongs to the author
  then
    set its visibility to the supplied value
    returns

remove(author: Author, annotation: Annotation) : returns ()
  where the annotation does not exist
  then
    refuses UNKNOWN_ANNOTATION "This annotation could not be found."
  where the annotation belongs to another author
  then
    refuses NOT_AUTHOR "You cannot remove another user's annotation."
  where the annotation exists and belongs to the author
  then
    remove the annotation
    returns

clearContext(context: Context) : returns ()
  where true
  then
    remove all annotations for the supplied context
    returns
```

### Queries

```queries
_forContext(context: Context) : many (annotation: Annotation, author: Author, item: Item, role: Role, note: String, visibility: Visibility)
  Returns the annotations belonging to a particular context.
```

## Pitching

### Purpose

Allow external contributors to propose items for an owner's consideration and preserve the owner's assessment of its fit, controlling who can see the exchange.
*Prevents:* Unapproved contributions changing the owner's collection; losing the reason for a judgment; making subjective judgments public by default.

### Principle

Daniel pitches a song that might fit Alex's word, setting its visibility to PUBLIC. The proposal remains PENDING until Alex reviews it. Alex marks it as a PARTIAL match with a note. Daniel can see Alex's review. If Daniel changes his mind before review, he can withdraw the pitch.

### Types

```types
external Contributor
  An opaque identity submitting the proposal.
external Target
  An opaque identity representing the criteria.
external Item
  An opaque candidate identity being proposed.
```

### State

```state
Fit is PENDING or MATCH or PARTIAL or MISS
Visibility is PRIVATE or PUBLIC

a set of Pitches with
  a contributor Contributor
  a target Target
  an item Item
  a fit Fit
  a note String
  a visibility Visibility
  unique target and item

Rule: New pitches have status PENDING and an empty note.
```

### Actions

```actions
pitch(contributor: Contributor, target: Target, item: Item, visibility: Visibility) : returns (pitch: Pitch)
  where an entry in Pitches already has target and item
  then
    refuses ALREADY_PITCHED "This item has already been pitched here."
  where no entry in Pitches has target and item
  then
    create a pitch with contributor, target, item, PENDING fit, an empty note, and the given visibility
    returns pitch

withdraw(contributor: Contributor, pitch: Pitch) : returns ()
  where the pitch does not exist
  then
    refuses UNKNOWN_PITCH "This pitch could not be found."
  where the contributor does not own the pitch
  then
    refuses NOT_CONTRIBUTOR "You cannot withdraw someone else's pitch."
  where the pitch has a fit other than PENDING
  then
    refuses ALREADY_REVIEWED "This pitch has already been reviewed."
  where the pitch exists, is owned by the contributor, and is PENDING
  then
    remove the pitch
    returns

review(pitch: Pitch, fit: Fit, note: String) : returns ()
  where the pitch does not exist
  then
    refuses UNKNOWN_PITCH "This pitch could not be found."
  where the pitch exists
  then
    set the pitch's fit to the new fit and note to the trimmed note
    returns

setVisibility(pitch: Pitch, visibility: Visibility) : returns ()
  where the pitch does not exist
  then
    refuses UNKNOWN_PITCH "This pitch could not be found."
  where the pitch exists
  then
    set the pitch's visibility to the supplied visibility
    returns

clearTarget(target: Target) : returns ()
  where true
  then
    remove all pitches associated with the supplied target
    returns
```

### Queries

```queries
_forTarget(target: Target) : many (pitch: Pitch, contributor: Contributor, item: Item, fit: Fit, note: String, visibility: Visibility)
  Returns all pitches proposed for the target.
```

## UserAuthenticating

### Purpose

Let people come back to their account by proving who they are with a password.
*Prevents:* someone signs in with a password other than the one set for that user; someone replaces the password of an account that already has one; someone who reads the stored data learns a person's password.

### Principle

Ben sets a password when he signs up, and the next day he authenticates with it. Leo guesses at Ben's password and is refused with "The username or password is incorrect." Leo then tries to set a new password for Ben, and is refused with "This account already has a password."

### Types

```types
external User
  The person a password belongs to.
```

### State

```state
opaque Secret

a set of Users with
  a verifier Secret

Rule: Authenticating stores only a verifier derived from the password, never the password itself.
```

### Actions

```actions
set(user: User, password: String) : returns (user: User)
  where password is shorter than 8 or longer than 128 characters
  then
    refuses INVALID_PASSWORD "A password must have 8 to 128 characters."
  where user already has a verifier
  then
    refuses PASSWORD_SET "This account already has a password."
  where password is accepted and user has no verifier
  then
    add user with a verifier derived from password
    returns user

authenticate(user: User, password: String) : returns (user: User)
  where user has no verifier, or password does not match it
  then
    refuses INVALID_CREDENTIALS "The username or password is incorrect."
  where password matches the user's verifier
  then
    returns user
```

### Queries

```queries
_acceptable(password: String) : one (acceptable: Flag)
  Returns true when the password has 8 to 128 characters, and false otherwise.
```

## Essential Reactions

```text
R1 — A selected excerpt becomes an example
When: Excerpting.select(track, startMs, endMs) returns excerpt e in an authorized AddExample request for association a, with role r and note n.
Then: Annotating.annotate(user, e, a, r, n).
Effect: The selected sound becomes evidence for the listener's definition.

R2 — A selected excerpt becomes a proposal
When: Excerpting.select(track, startMs, endMs) returns excerpt e in an authorized ProposeExample request addressed to association a, with contributor c and visibility v.
Then: Pitching.pitch(c, a, e, v).
Effect: A friend can propose a sound without changing the listener's accepted examples.

R3 — Promoting a pitch to an accepted example
When: Pitching.review(pitch, MATCH, response) succeeds for excerpt e and target association a, in an authorized request containing the owner's public example note n.
Then: Annotating.annotate(owner, e, a, EXAMPLE, n).
Effect: A highly-rated pitch becomes part of the owner's personal explanation. 

R4 — Removing a definition removes its explanations
When: Associating.remove(user, association) succeeds for association a.
Then: Annotating.clearContext(a).
Effect: Examples and counterexamples do not remain attached to a definition that no longer exists.

R5 — Removing a definition clears its pitches
When: Associating.remove(user, association) succeeds for association a.
Then: Pitching.clearTarget(a).
Effect: Pending and reviewed pitches cannot continue to target a removed definition.
```

# User Journey

Alex wouldn’t consider themselves a music connoisseur, but they’ve collected a pretty extensive playlist of songs to get themselves through their lengthy commute. When the playlist was just getting started, adding something new that fit the vibe was easy, and they spent most of the commute jamming out instead of focusing on how many more minutes it would be until their next stop, or how loud that other passenger was.

These days, it was getting harder to find something new that fit the vibe, so they turned to the group chat. They told their friends that they needed something ‘hype’ and everyone gave a different answer that didn’t sound like Alex’s kind of hype. Song after song was met with a vague rejection of “That just isn’t hype”, annoying the group chat immensely. Fed up with pinpointing Alex’s taste by playing a neverending game of musical Whack-a-Mole, one of their friends sends them a link to Sound It Out, telling Alex to make things easier by describing hype there, and they can give suggestions in their free time.

Clicking on their friend’s link, Alex can see a variety of emotional words like ‘hype’ and ‘dreamy’ with a play button next to them. Clicking on hype, they’re unfortunately met with a plethora of EDM samples, which is apparently what their friend considers a hype tune.

Inspired by a desire to show said friend what hype really means, Alex clicks on the ‘Describe Your Taste’ button and is presented with a similar looking initial wall as their friend had, but with some words unaccounted for. Seeing some issues in how ‘hype’ was currently described, Alex clicks onto the hype bubble and sees it unfurl into its constituent songs. They remove some of them from the bubble and add their own choices by clicking an ‘Add Song’ button that allows them to search within the app’s database for a hype song. Alex is prompted to pinpoint a hype sample, highlighting a section of the song’s waveform as a selector. Afterward, they click on the play button associated with hype and hear it cycling between their selected samples.

Alex plays around with the wall for a bit, Alex notices some hint text telling them that by making an account, they can receive suggestions of songs to add from their friends, as well as some automated suggestions. After making an account, they see the same sound wall as the one they made during setup and have the ability to share a link to their wall, which they send in the group chat.

Now that their friends can listen to what Alex means by ‘hype’, they engage in some friendly ribbing about their song choices, and leave some suggestions of songs to add, with each suggestion accompanied by a snippet the friend found representative of ‘hype’. Alex approves some suggestions and rejects others, and leaves some suggestions on their friends’ walls as well.

To describe their music taste to a friend now, Alex sends them a link to their sound wall, and invites them to click play on some words. Instead of retreading an explanation of what they mean by ‘hype’ any time they’re asking for suggestions for new music, a friend can click on Alex’s page and hear their association.

# Visual Design Study

Sound It Out should feel like exploring a personal record collection: expressive enough to reflect someone's musical taste, but organized enough that another person can understand it without explanation. Our visual study draws from vinyl artwork, independent music magazines, record-store displays, and editorial typography. These references suggest a design in which music supplies the personality while the interface provides a clear structure for understanding it.

The central challenge is distinguishing what a listener means, which songs demonstrate that meaning, and what other people have suggested. Our visual choices make these relationships visible without requiring users to inspect every song or read every explanation.

### 1. Color Study — Expressive Music, Quiet Interface

Our palette combines warm, paper-like backgrounds with deep plum text and a focused violet accent. The references use vibrant records, concert lighting, and textured print design, but we deliberately avoid applying that intensity to every interface element.

| Role | Color | Application | 
| ----- | ----- | ----- | 
| Canvas | `#FBF8F4` | Warm background for the Sound Wall | 
| Surface | `#FFFDFB` | Word entries, examples, and review panels | 
| Ink | `#282132` | Primary text and definitions | 
| Muted | `#746C7D` | Supporting explanations and metadata | 
| Accent | `#6B47CF` | Primary actions, selected controls, and focus | 
| Border | `#DED7E5` | Subtle separation between related content | 

Violet draws attention to decisions such as Add Word, Add Example, and Share, rather than competing with the songs themselves. Neutral surfaces allow album artwork and waveform previews to communicate musical character without making the overall page visually overwhelming.

Three softer colors communicate the state of an interaction:

* Warm cream (`#FFF7E6`) identifies a word that still needs an illustrative example.
* Mint (`#E1F3E9`) identifies an example that fits a listener's definition.
* Soft peach (`#FBE3E2`) accompanies a correction or partial mismatch.

These states always include text labels. Color reinforces meaning rather than carrying it alone. In particular, a friend's rejected suggestion is not displayed as a public negative rating; private appraisals remain in the owner's review interface.

The resulting hierarchy is intentionally restrained. Users should first notice the word and its meaning, then the examples that support it, and finally the actions available to them.

### 2. Typography and Layout Study — A Personal Music Dictionary

We use Inter Variable throughout the interface, drawing from the bold editorial hierarchy of record sleeves and music publications while retaining the readability of a modern application.

The typography study establishes five levels:

| Level | Treatment | Example | 
| ----- | ----- | ----- | 
| Page heading | Inter 520, 32–44px | Sound Wall | 
| Word heading | Inter 520, 28–38px | Define your dreamy | 
| Definition | Inter 400, 16px | Airy vocals and layered synths | 
| Section label | Inter 600, 12px | Why this fits | 
| Supporting metadata | Inter 400, 12–13px | 3 examples · 1 counterexample | 

The hierarchy follows the order in which someone encounters an unfamiliar definition. The word receives the strongest emphasis, followed by its personal description. Excerpts and their explanations occupy a consistent supporting area, while timestamps, track information, and secondary controls remain visually quieter. Small metadata is supplementary rather than necessary to understand or complete a task; the implemented interface will test readability at normal viewing sizes and support text resizing.

The Sound Wall uses a collection-oriented layout inspired by record sleeves. Each word forms a distinct entry that can expand to reveal its examples and counterexamples. Consistent alignment, spacing, and card structure make entries easy to compare without requiring a rigid musical taxonomy.

The same organization carries into suggestions. A proposed song appears separately from accepted examples, with its contributor's explanation and an explicit review action. Accepted examples join the owner's collection only after approval. This visual separation reflects the design's underlying concepts: a suggestion is not yet part of someone's definition, and a private appraisal is not a public judgment.

### 3. Applying the Style to the User Journey

Consider Alex sharing their meaning of "hype." Their Sound Wall first presents the word prominently, followed by the description "Fast, driving percussion without overpowering vocals." Below it, a small collection of song excerpts illustrates the sound, each accompanied by a note explaining why it fits.

When Daniel opens Alex's shared entry, he encounters the definition and deliberately shared examples before proposing a song. He does not need to infer the intended qualities from an unexplained playlist. When Alex reviews his suggestion, the interface distinguishes the proposed excerpt, Daniel's reasoning, Alex's private assessment, and the decision to incorporate it.

This structure helps users understand both the overall collection and the details of a particular exchange. It also allows Alex to share one word without exposing unrelated associations or private evaluations.

### 4. Accessibility and Design Boundaries

A sound-centered experience must remain usable without relying entirely on sound or visual decoration. Excerpts are accompanied by track information and written explanations; playback controls require accessible names, keyboard operation, and visible focus states. Example roles and review outcomes use explicit labels rather than color alone. The Sound Wall should preserve a logical reading order when entries expand or collapse.

# Design Summary

The overall design solves the core "semantic gap" of musical adjectives through independent, composable concepts. `Associating` gives users ownership over their text definitions, while `Excerpting` strictly binds those definitions to exact milliseconds of audio so there is no ambiguity about which part of the track represents the vibe. `Annotating` ties the excerpt to the definition with an explanatory note. To support the collaborative workflows without exposing private tastes, the application relies heavily on `Pitching` and `UserAuthenticating`.

Instead of relying on complex URL tokens to share walls, `Associating` handles visibility explicitly (PUBLIC vs. PRIVATE). Friends can view the user's public wall and submit ideas via `Pitching`, which merges the proposal and its evaluation (MATCH, PARTIAL, MISS) securely in the background without polluting the owner's permanent `Annotating` collection until promoted.

**Ethical Alignments:**

* **Privacy:** Pitching evaluations (like a MISS) can remain entirely private, avoiding publicly grading a friend’s taste.
* **Control:** The owner decides if an annotation is PRIVATE or SHARED, meaning they never have to explain a personal memory to a public audience.
* **Consent:** A friend’s pitched song cannot automatically place itself on the owner's public wall.

**Unclear Issues:**
It remains unclear if music APIs like SoundCloud will reliably support arbitrary timestamp-based playback for external excerpts, meaning we may have to fall back on full-track playback or 30-second standard previews if we run into licensing blockers.

# Development Plan

### 1. Development Timeline

Our development will focus on building a functional Sound Wall that allows users to communicate their musical preferences through personal definitions and song examples. To keep the project feasible, we will initially use a curated library of approximately 15–25 songs rather than implementing a full music search system. We plan to source these songs from SoundCloud and use its embedded player for playback, storing only song metadata and references.

| Stage | Expected Deliverables |
| ----- | ----- |
| **Initial Development** | Set up the frontend, backend, and database. Select approximately 15–25 SoundCloud tracks, verify that they can be embedded, and store their metadata. Implement basic user identification (`UserAuthenticating`) and create the initial Sound Wall interface. Divide implementation responsibilities across team members so core concepts can be developed in parallel. |
| **Checkpoint 1 (Functional MVP + User Testing)** | Complete a functional end-to-end MVP incorporating all core concepts. Implement `Associating` so users can create, edit, and delete subjective musical labels and descriptions. Implement `Annotating` so users can attach songs from the curated library to their definitions and explain why they fit. Integrate SoundCloud playback. Implement basic `Excerpting` using song timestamps where supported. Implement `Pitching` so friends can recommend songs with explanations. Implement basic `Appraising` so users can evaluate recommendations and `Suggesting` so users can receive relevant song suggestions. Connect these interactions so users can build their Sound Walls, explore others' interpretations, and incorporate new musical examples. Conduct initial user testing of the complete workflow and document usability issues. |
| **Checkpoint 2 (Feature Completion + Iteration)** | Expand the functionality of `Excerpting`, `Appraising`, and `Suggesting` based on initial testing. Improve timestamp-based playback, recommendation evaluation, and song suggestion interactions. Add counterexamples and private/shared annotation controls. Address usability issues identified during Checkpoint 1, particularly around defining musical labels, understanding others' interpretations, and evaluating recommendations. Conduct a second round of user testing to validate improvements. |
| **Final Submission (Polish + Validation)** | Integrate and refine all concepts to ensure the complete user journey works reliably. Improve UI interactions and visual consistency, fix remaining bugs and edge cases, and test privacy and authorization boundaries. Incorporate high-priority feedback from both rounds of user testing. Prepare the final demo and documentation. |

### 2. Team Responsibilities

We will divide responsibilities by major application features, while collaborating on integration, testing, and design decisions.

| Team Member | Primary Responsibilities |
| :--- | :--- |
| **Rebecca** | Implement `Associating` and the personal Sound Wall, including creating, editing, and organizing definitions. Help integrate the concepts into the main application. |
| **Sanskriti** | Implement `Excerpting` and music search/playback integration, including selecting song intervals and displaying playable examples. |
| **Bhadra** | Implement `Annotating`, `Appraising`, and `UserAuthenticating`, including example/counterexample management, private evaluations, and visibility controls. |
| **Victor** | Implement `Pitching` + `Suggesting`, including public/private toggles, suggestion submission, and the review workflow. |
| **Entire Team**| Collaborate on UI design, integration, testing, accessibility, and resolving issues identified through user feedback. |

### 3. Key Risks and Mitigation Strategies

**Risk 1: Music API and Excerpt Playback Limitations**
*Risk:* Our design depends on allowing users to select and play specific portions of songs. Music APIs may restrict playback, require authentication, or prohibit arbitrary excerpt selection.
*Mitigation:* Investigate available music APIs and their playback restrictions early. Build a small proof of concept before implementing the full excerpt selection interface. Keep `Excerpting` independent of the playback provider so that the rest of the application does not depend on a particular API.
*Fallback:* If arbitrary excerpt playback is not supported, use authorized song previews or links to external music platforms. Users can still identify relevant timestamps and explain why those moments represent their definitions, even if the application cannot play those exact intervals directly.

**Risk 2: Complexity of Integrating Concepts**
*Risk:* Several user workflows require multiple concepts to interact. For example, accepting a pitch must update its review status and create an annotation without producing duplicate or inconsistent state. Deleting a definition also requires cleaning up associated annotations, suggestions, and appraisals.
*Mitigation:* Implement and test concepts independently before connecting them through reactions. Define clear interfaces between concepts and add integration tests for important workflows, particularly accepting pitches and deleting definitions.
*Fallback:* If full integration becomes too complex, prioritize the essential workflows of creating definitions, adding examples, and sharing them. 

**Risk 3: Sharing and Privacy**
*Risk:* Users may accidentally expose personal definitions, private annotations, or evaluations when sharing their Sound Wall. Sharing links also introduce the possibility of unauthorized modifications.
*Mitigation:* Make annotations private by default and require explicit visibility changes before they appear in shared views.
*Fallback:* If selective sharing is too difficult to implement reliably, restrict sharing to individual definitions with explicitly approved examples rather than supporting multi-definition links. We will not expose private information as a shortcut to completing the feature.

**Risk 4: Scope and Time Constraints**
*Risk:* Implementing five concepts, music integration, authentication, collaborative workflows, and a polished interface may exceed the amount of time we have to develop it.
*Mitigation:* Prioritize features according to their importance to the user journey. Establish a working end-to-end experience early rather than implementing every concept completely before integration. Use the checkpoints to identify blockers and adjust scope.
*Fallback:* Focus the final application on three essential capabilities:
1. Creating personal definitions of musical labels.
2. Attaching songs or excerpts that demonstrate those definitions.
3. Sharing those definitions so others can understand the intended meaning.
If necessary, simplify the pitch workflow. These features improve the experience but are not required to demonstrate the central value of Sound It Out.

**Risk 5: User Understanding of the Interface**
*Risk:* Users may not immediately understand the difference between examples, counterexamples, pending suggestions, and private evaluations. They may also struggle to identify which actions affect their own Sound Wall versus someone else’s.
*Mitigation:* Use consistent visual grouping, explicit labels, and distinct interfaces for accepted examples and pending pitches. Conduct user testing on the core workflows and observe whether participants can complete them without additional explanation.
*Fallback:* Simplify the interface by initially displaying only definitions and accepted examples. Counterexamples and private evaluations can be placed behind secondary controls or omitted from the initial experience if they introduce unnecessary confusion.

### 4. Development Priorities

Our highest priority is demonstrating that Sound It Out can communicate a person's subjective understanding of music more effectively than an ordinary playlist or text description.

We therefore consider `Associating`, `Excerpting`, `Annotating`, and `UserAuthenticating` essential to building the personal Sound Wall. `Pitching`, `Appraising`, and `Suggesting` are also core MVP features because they enable the collaborative music discovery experience described in our user journey. By Checkpoint 1, we aim to have a functional end-to-end application that allows users to define musical concepts, illustrate them with song examples, exchange and evaluate recommendations, and discover new music. We will conduct initial user testing at this stage to identify usability issues and evaluate whether the application effectively communicates subjective musical interpretations.

We will prioritize implementing simplified versions of all core concepts before expanding their functionality. This allows us to maintain a functional application throughout development while using feedback from Checkpoint 1 to guide improvements for Checkpoint 2 and the final submission.