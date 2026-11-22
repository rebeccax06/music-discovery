# Sound It Out: MVP product and implementation brief

**Authors:** the Sound It Out team — Bhadra Rupesh, Sanskriti Singh, Rebecca Xiong, and Victor ([team page](../team.md))  
**Audience:** teammates building the MVP, and a coding agent working in this repository  
**Status:** implemented through increment 6, locally. [Section 2](#2-what-exists-today) describes the starting point at commit `ad9439a`. The [decision log](../design/decisions.md) records what was built, where it departs from this plan, and how each part was checked. The largest departure is an added Friending concept ([D8](../design/decisions.md#d8-friends-and-a-third-audience-for-a-word)). Deployment, the recording, and user sessions are still to do ([status](#implementation-status)).  
**Research checked:** November 22, 2026

## Contents

- [Implementation status](#implementation-status)
1. [Start here](#1-start-here)
2. [What exists today](#2-what-exists-today)
3. [The product](#3-the-product)
4. [MVP scope](#4-mvp-scope)
5. [User journeys](#5-user-journeys)
6. [Seven decisions that shape the design](#6-seven-decisions-that-shape-the-design)
7. [Concept specifications to change](#7-concept-specifications-to-change)
8. [Compositions, endpoints, and authorization](#8-compositions-endpoints-and-authorization)
9. [Front-end structure](#9-front-end-structure)
10. [Interaction design](#10-interaction-design)
11. [Visual design](#11-visual-design)
12. [Music and descriptions](#12-music-and-descriptions)
13. [Testing and validation](#13-testing-and-validation)
14. [Increments](#14-increments)
15. [Repository, deployment, and submission](#15-repository-deployment-and-submission)
16. [How this maps to the course rubrics](#16-how-this-maps-to-the-course-rubrics)
17. [Open questions](#17-open-questions)
18. [Sources](#18-sources)
19. [Prompt for a coding agent](#19-prompt-for-a-coding-agent)

## Implementation status

As of November 22, 2026, increments 0 to 6 in [Section 14](#14-increments) are built
and verified locally: `bun run check`, 56 concept, draft, and HTTP tests, and 18
browser-journey steps against a real database with real SoundCloud playback. Saved
results are in [design/verification](../design/verification/README.md).

What differs from this plan:

- **Friends ([D8](../design/decisions.md#d8-friends-and-a-third-audience-for-a-word)).**
  A Friending concept and a third audience for words, "your friends", sit between
  private and public. A Friends page shows requests, friends' words, and the songs you
  suggested. Suggestions are open to anyone signed in for a public word and to
  friends for a friends' word.
- **Honest answers after a race ([D9](../design/decisions.md#d9-an-add-that-loses-the-race-to-a-removal-says-so)).**
  Endpoints that write into a word return the word as read after the write, so an
  add that loses the race to a removal is reported as not kept.
- **Routes.** Suggestions sent are listed across all words at `/suggestions/sent`,
  not per word. The record-shelf "Public" switch was removed, because one switch
  cannot express three audiences.

Still to do: increment 7 (sessions with people) and increment 8 (deployment, the
deployed check, the recording).

## 1. Start here

Sound It Out helps friends show each other what a subjective music word means **to them**, using real songs as the evidence. Alex picks a word such as “dreamy,” adds songs that sound dreamy to them, and taps a few qualities they hear in each one. Daniel opens Alex's link, listens, and suggests a song. Alex reviews it privately and can add a match to their examples.

Three things changed from [F3](sound-it-out-f3.md), and the rest of this brief follows from them:

1. **Music first, writing optional.** A word no longer needs a written description, and an example no longer needs a written note. The owner picks qualities from a short list, and the app turns those picks into a draft sentence.
2. **The draft is computed, never stored.** It is a pure function of the qualities on screen. This removes the generated-versus-edited bookkeeping the earlier draft of this brief called for, and it makes the public description safe by construction ([D1](#d1-the-draft-description-is-computed-on-read-and-never-stored)).
3. **No cross-concept transactions.** F3 required every multi-concept request to be atomic. The sync engine commits each action independently and says so in its documentation. We keep every race-sensitive rule inside the concept that owns the state, and repair the one remaining cross-concept relation with a reaction ([D3](#d3-no-cross-concept-transactions-owner-constraints-plus-one-repair-reaction)).

**One constraint to keep in view:** SoundCloud's API terms restrict using SoundCloud user content as input to AI without an explicit license, and an embedded player gives our code no access to the audio. So the app cannot “listen” to a song and describe it. The draft comes only from what the owner picked. Do not label anything in this MVP as audio analysis.

**First demo to build, in this order:**

1. Alex registers, chooses “dreamy,” adds a real playable track, and picks two qualities. The draft appears.
2. Alex shares the word and that song, and copies the link.
3. Daniel opens the link signed out, listens, signs in, and suggests a track.
4. Alex marks it a match and adds it to their examples. It starts private.

This must run on persisted data, with two separate accounts, on the deployed build, with no page refresh.

**If you read only three more sections:** [Section 2](#2-what-exists-today) for the true starting point, [Section 6](#6-seven-decisions-that-shape-the-design) for the decisions, and [Section 14](#14-increments) for the order of work.

## 2. What exists today

This inventory comes from reading the code and tests at `ad9439a`. The test suite was not run for this brief; run it before relying on the counts.

| Area | What exists | Gap for the MVP |
| --- | --- | --- |
| Accounts | Register, sign in, restore, sign out. HttpOnly session cookie, origin check on cookie routes. Four concept tests and two HTTP tests. | No lookup from a user identity to its username, which the review screen needs to say who suggested a song. |
| Words | [Associating](../design/concepts/Associating.md): create, rename, describe, set visibility, remove. Unique per owner after normalizing spacing and case. Five concept tests. | A description is **required**. |
| Examples | [Annotating](../design/concepts/Annotating.md): add, update, set visibility, remove, clear a context. Four concept tests. | A note is **required**. There are **no HTTP routes**: the integration test creates annotations by calling the concept instance. No qualities. |
| Music | None. `Item` is bound to a placeholder type, `SoundExcerpt`. The interface shows notes only: no track, no player. | Catalog, player, and a real item identity. |
| Suggestions | Pitching is specified in F3 but not implemented. | All of it. |
| Excerpting | Specified in F3 but not implemented. | Deferred ([D4](#d4-an-example-points-at-a-whole-track-excerpting-waits)). |
| Sharing | A whole wall at `/?wall=<username>` lists public words with their shared examples. | No link to one word. No single place to see what visitors will see. |
| Deletion | `Associating.remove`, then `Annotating.clearContext`, in one request. The steps commit separately. | A concurrent add can land after the cleanup ([D3](#d3-no-cross-concept-transactions-owner-constraints-plus-one-repair-reaction)). |
| Front end | [app.ts](../web/app.ts) shell, `useAccount`, `useWall`, `web/components/SoundWall.ts` (since replaced) (491 lines covering the shelf, the add form, the word page, and editing), `web/components/PublicWall.ts` (since replaced). | One error-message table keyed by HTTP category, so `CONFLICT` always reads “You have already defined this word.” Hand-written response types. Limits duplicated between Vue and the composition. |
| Styles | [styles.css](../web/styles.css), 1,010 lines, color tokens on `:root`. | At least 15 class selectors that no template uses ([Section 11](#what-to-clean-up)). |
| Deployment | None. No public URL and no recording. | Required for the alpha. |

Three places where documents and code already disagree. Fix these in the first increment, because the rubric counts unexplained drift against us:

- [alpha-integration.md](../design/alpha-integration.md) says “All 10 concept and HTTP tests passed.” The repository now holds 17 tests (13 concept, 4 HTTP).
- The [README](../README.md) says a user can “attach a song excerpt.” No route or screen does that yet.
- F3's concept specifications differ from [design/concepts/](../design/concepts/) (for example, `Associating.update` now takes a label). F3 is the submitted snapshot; `design/` is the live specification. The README should say so.

## 3. The product

**Problem.** Words like “dreamy,” “hype,” and “warm” mean different sounds to different people. Text is hard to write and does not settle the question. A playlist gives examples but does not say which aspect of each song matters.

**Promise.**

> Show someone what your music word sounds like, and use their response to find more music together.

A word is a personal collection of examples. The same word exists independently on each person's wall. The owner decides what is public and what counts as a match. Any description the app writes is a draft built from the owner's own picks, never a measurement of their taste.

**How the flow changes from F3.** F3 had the owner write a definition and then attach examples. Now:

1. Pick a suggested word or type your own.
2. Add one or more songs.
3. Optionally pick what you hear in each song.
4. Read the draft the app composes from those picks; replace it with your own words if you like.
5. Share, and receive suggestions.

**Not in the MVP:**

- Training or running a music model, downloading or scraping audio, or claiming to infer anything from audio.
- Following, feeds, public comments, or a Spotify integration.
- Precisely bounded excerpt playback or an audio editor.
- Any screen that makes a visitor learn names like `Associating` or `Pitching`.

## 4. MVP scope

### Must work for the demo

1. **Accounts.** Register, sign in, sign out, and return to a session.
2. **Choose a word.** Pick from a short suggested list or type one. No description required. Private by default.
3. **Add real music.** Choose a track from a verified catalog and hear it in the official SoundCloud player before and after adding it.
4. **Say what you hear.** Optionally pick up to five qualities per song and add a short note.
5. **Read an honest draft.** A sentence built only from picked qualities. With no picks, the app says how to get one and invents nothing.
6. **Manage examples.** Edit qualities and notes, remove a song, and choose which songs visitors can see.
7. **Share.** Make a word public and copy a link to it. Visitors see only the public word and its shared songs.
8. **Suggest and review.** A signed-in visitor suggests a track for a public word. The owner sees it apart from their examples, records match, partly, or miss, and can add a match to their examples. Reviews stay private.
9. **Hold together.** No page refresh after any action, authorization enforced on the server, data persisted, and a clear state for loading, empty, failed, and unavailable.

### Deferred, and where each deferral is recorded

Record each of these in `design/decisions.md` (created in increment 0, [Section 14](#14-increments)) and in the README's limitations, so that nobody reads F3 and assumes they exist.

| Deferred | Why | What stays ready for it |
| --- | --- | --- |
| Excerpts (a start and end within a track) | Exact playback bounds are unverified with the provider. | `Item` is opaque to Annotating and Pitching, so adding Excerpting later is a rebinding in [types.md](../design/types.md). |
| Counterexamples in the interface | They double the choices in the add-song step. | Annotating keeps the `COUNTEREXAMPLE` role and the example card renders it. |
| Sharing a review with the contributor | Private-by-default covers the ethical concern; sharing is an extra flow. | Add `responseShared` to Pitching later, as F3 specified. |
| SoundCloud search and paste-a-link | Needs API credentials the team may not have. | The catalog module is the only place that knows where tracks come from. |
| LLM rewording of the draft | Needs hosting and an evaluation; the template is honest and free. | The draft function has one caller. |

## 5. User journeys

### A. Build a word from music

1. Alex signs up and sees an empty wall with one action: **Choose a word**.
2. Alex taps **Dreamy** from the suggestions, or types a word. The word is created private and its page opens.
3. The page says **Add a song that sounds dreamy to you** and shows the catalog. Alex plays a track, then selects it.
4. Under the selected track, Alex taps **airy vocals** and **soft drums**, skips the note, and chooses **Add to Dreamy**.
5. The song appears under Examples, marked **Only you**. Above it the draft reads: *For you, “Dreamy” means airy vocals and soft drums.* It is labeled **Draft from the qualities you picked**.
6. Alex adds a second song with **airy vocals** and **layered synths**. The draft becomes: *For you, “Dreamy” often means airy vocals, with soft drums or layered synths.*
7. Alex opens **Share**, ticks the first song, sees exactly what a visitor will see, chooses **Make public**, and copies the link.

*When things go wrong:* a duplicate word offers to open the existing one. A track that will not load shows a link to the track's SoundCloud page and can still be added. A failed save keeps Alex's picks and note in place and offers **Try again**.

### B. Understand a friend's word and suggest a song

1. Daniel opens the link signed out. He sees Alex's word, the description, and only the songs Alex shared, each playable.
2. Daniel chooses **Suggest a song**. The app asks him to sign in and says why. After signing in he is back on the same word with the picker open.
3. Daniel picks a track, optionally adds a note, and chooses **Send suggestion**. The page confirms: *Sent to Alex. It is a suggestion; Alex decides whether it joins their examples.*
4. Under **Your suggestions**, Daniel sees the track marked **Waiting for Alex**, with **Withdraw**.

*When things go wrong:* songs already on Alex's shared list are marked **Already on this word** in the picker and cannot be chosen. A song someone already suggested gets *This song has already been suggested here. Pick another?* and the picker stays open. If Alex made the word private in the meantime, Daniel sees *This word is no longer public* and a link to Alex's wall.

### C. Review and accept a suggestion

1. Alex's wall shows **1 suggestion** on the Dreamy sleeve. The word page has a **Suggestions** section below Examples.
2. Alex plays the track and chooses **Match**, **Partly**, or **Doesn't match**, with an optional private note. The section says **Only you can see your review**.
3. On a match, **Add to examples** appears. Alex picks qualities or skips them. The song joins Examples marked **Only you**.
4. Alex shares it from the Share panel when ready.

*When things go wrong:* if the song is already an example, Alex sees *This song is already one of your examples* and nothing changes. Alex can change a review at any time; changing it does not remove an example already added.

## 6. Seven decisions that shape the design

Each decision names the difficulty, what we chose, what we rejected, and how we will know it holds. Copy each into `design/decisions.md` when it is implemented, with the commit and the check that was run.

### D1. The draft description is computed on read and never stored

**Difficulty.** An earlier version of this brief stored the draft on the word, with a mode flag (`generated` or `edited`), an evidence revision to stop stale writes, a rule for regenerating after each change, and a rule for which examples may feed a public draft. That is four mechanisms guarding one sentence, and each can fail: a late write overwrites an edit, a regeneration misses a change, or a public draft reveals a private pick.

**Decision.** Associating stores only what the owner wrote, which may be empty. The draft is a pure function, `draft(label, examples)`, applied to whichever projection is on screen. The page shows the owner's text when it is not empty and the draft otherwise.

**What this removes.**

- *Stale drafts.* Nothing is stored, so nothing goes stale. The draft changes the moment the wall reloads after an edit.
- *Overwritten edits.* Generation never writes, so it cannot overwrite. No mode flag is needed: an empty description means “use the draft.”
- *Private picks leaking into a public description.* A visitor's draft is computed from the public projection, which holds only shared examples. A private example's qualities are not in the input, so they cannot be in the output.

**Rejected.** Storing the draft with a mode flag and revision (more state, three races). Generating on the server and storing a second “public draft” (a second copy to keep in step). The sync-engine design guide gives the rule we are following: store derived state only when it has a stated refresh rule or historical meaning.

**How we know.** Unit tests on the function ([Section 13](#13-testing-and-validation)), an HTTP test that edits examples and confirms the stored description is byte-for-byte unchanged, and the privacy sweep.

### D2. Qualities live inside Annotating, not in a new concept

**Difficulty.** Picked qualities are new state. A separate `Tagging` concept would look more modular.

**Decision.** Add `qualities`, a set of short strings, to the annotation. The note becomes optional. Annotating treats qualities as opaque text; the list of offered qualities is application vocabulary, checked at the request boundary.

**Why.** Qualities have the same author, the same lifecycle, and the same visibility as the annotation they describe. A separate concept would need a cascade when an annotation is removed, another when a word is removed, and a rule tying tag visibility to annotation visibility. That is two more cross-concept relations of exactly the kind D3 works to minimize, with no reuse to show for it. The engine's guide lists “one part is only a passive field” as evidence for keeping state together.

**Purpose shift to record.** Annotating's purpose changes from “preserve an explanation” to “record how an item relates to a context, with whatever explanation its author chooses to give.” An annotation with no note and no qualities is valid: its role alone says “this is an example.”

### D3. No cross-concept transactions: owner constraints plus one repair reaction

**Difficulty.** F3 says requests that touch several concepts are atomic, and [alpha-integration.md](../design/alpha-integration.md) plans a shared transaction boundary. The engine's operations reference ([Sources](#18-sources)) states that each action commits independently and that it does not transact across actions or concepts. A MongoDB transaction spanning two concepts' collections would also need a replica set on the class host and would tie the concepts' storage together.

**Decision.** Sort every F3 atomicity requirement into one of two kinds and handle each kind in the place the engine's guide assigns it.

*Race-sensitive decisions go inside the owning action, backed by a unique index or a conditional write:*

| Requirement | Owner | Mechanism |
| --- | --- | --- |
| One word per owner and normalized label | Associating | Unique index on `(user, normalizedLabel)` (exists) |
| One annotation per word and track; promoting twice adds once | Annotating | Unique index on `(context, item)` (exists). A second promotion is refused with `ANNOTATION_EXISTS`. |
| One pitch per word and track | Pitching | Unique index on `(target, item)` |
| A pitch cannot be reviewed after it is withdrawn, or withdrawn after review | Pitching | `withdraw` deletes only where `fit` is `PENDING`; `review` updates only an existing pitch. Each is one document write. |

*The one true cross-concept relation is repaired, and the record the engine's guide asks for is written down:*

| | Relation: every annotation and pitch refers to a word that exists |
| --- | --- |
| Owners | Associating (words), Annotating (examples), Pitching (suggestions) |
| What can break it | An add or a pitch reads the word, the owner removes the word and its dependents, then the add writes. |
| Rule that preserves it | Removal clears dependents. In addition, a repair reaction runs after every successful `annotate` and `pitch`: where the word no longer exists, clear that context again. `clearContext` and `clearTarget` are idempotent. |
| How long it can be false | From the late write until the repair reaction, within the same request flow. |
| If repair faults | The orphan stays in storage. It is unreachable: every read starts from a word that exists, word identities are random and never reused, and re-creating “dreamy” makes a new identity. |
| Automatic | Yes. |

**What this removes.** The replica-set requirement, a cross-concept transaction API, and the false claim of atomicity. Deployment needs only a plain MongoDB.

**Rejected.** Multi-document transactions (topology and coupling, above). Soft-deleting words (every query grows a filter, and the user asked to delete). A lock per word (does not survive more than one server process).

**How we know.** A race test that reports how many of its trials produced the dangerous interleaving, so a run that never exercised the race is visible ([Section 13](#risk-2-a-song-added-while-its-word-is-being-removed)).

### D4. An example points at a whole track; Excerpting waits

**Difficulty.** F3 binds examples to a millisecond interval. Whether the widget can reliably start and stop at given positions for every track and browser is unverified.

**Decision.** For the alpha, replace the placeholder `SoundExcerpt` type with `Track`, a catalog reference such as `soundcloud:293`. Do not implement Excerpting. Name the type for what it is so the specification does not claim intervals.

**Why this is safe.** Annotating and Pitching already treat `Item` as opaque. Adding Excerpting later changes two lines of [types.md](../design/types.md) and the code that builds the item, and no concept. No route has ever created an annotation, so there are no stored items to migrate; do not add a compatibility path for old rows.

### D5. One Share panel over two stored visibilities, changed in fail-closed order

**Difficulty.** A song is visible to visitors only when the word is public **and** the song is shared. Two switches in two places is the easiest thing to build and the hardest to understand: an owner makes a word public, sees no songs on the public page, and does not know why.

**Decision.** Keep the two stored facts in their two concepts. Present them in one Share panel on the word page: a tick per song, one **Make public** action, the link, and a preview of what visitors see. The preview is the answer from the real public endpoint, not a simulation in the browser, so it cannot disagree with what a visitor gets.

**Order of writes.** When one action changes several things, order the requests so that a failure partway leaves *less* visible than intended, never more:

- *Share all songs and make public:* share the songs first, then make the word public. If any step fails, stop and report what was saved: *2 songs are marked shared. The word is still private, so nothing is visible yet.*
- *Make private:* one request on the word hides everything at once. Song ticks are kept for next time, and the panel says so.

**Rejected.** A single “publish” endpoint that sets both in one request: it would still be two actions that commit separately (D3), so it would add an endpoint without adding atomicity. Collapsing to one visibility: it would force an owner to expose every song or none.

### D6. A suggestion never reveals a private example

**Difficulty.** The obvious validation is “refuse a suggestion for a song that is already an example.” But if the example is private, that refusal tells the contributor it exists.

**Decision.** The server accepts a suggestion whether or not a private example exists for that track. The owner finds out at promotion, where `ANNOTATION_EXISTS` becomes *This song is already one of your examples.* The picker marks songs **Already on this word** using only the public projection, which the visitor can see anyway. A request to suggest for a private word and for a word that does not exist return the same not-found error.

**Kept from F3, as a known limitation.** One pitch per word and track means a second contributor learns that someone already suggested that song. We accept this for the alpha because it keeps one decision per song in the owner's queue.

### D7. A word link is the public wall plus a word, with no new endpoint

**Decision.** The link is `/?wall=alex&word=dreamy`. The page loads the existing public wall and opens the word whose normalized label matches. A missing or private word shows *Alex has no public word called “dreamy”* above Alex's wall.

**Why.** The public wall response already contains every public word, so a per-word endpoint would be a second projection to keep private-safe. The cost is that renaming a word changes its link; the Share panel says *Renaming this word changes its link.*

## 7. Concept specifications to change

Edit the specification first, then the class, then the tests, then run `bun run check:design` and `bun run generate`. Specifications live in [design/concepts/](../design/concepts/).

### Associating

- `associate` and `update` refuse `INVALID_ASSOCIATION` only when the normalized label is empty. The message becomes “Provide a word.”
- The description is stored trimmed and may be empty. An empty description means the owner has not written one.
- Existing rows all have a description, which is valid under the new rule. No migration.

### Annotating

- Purpose and principle: revise as in [D2](#d2-qualities-live-inside-annotating-not-in-a-new-concept).
- State: add `a qualities set of String`. Add the rule: *Store each quality trimmed and lowercased, without duplicates or empty entries. Store the note trimmed; it may be empty.*
- `annotate(author, item, context, role, note, qualities)` and `update(author, annotation, role, note, qualities)`.
- Remove the `INVALID_NOTE` refusal from the specification, the class, and the registration in [concepts.ts](../src/concepts.ts).
- `_get` and `_forContext` return `qualities` in ascending order, so responses are stable.

### UserAuthenticating

- Add `_username(user) : optional (username: String)`, returning the stored display name. The review screen uses it to show who suggested a song.

### Pitching (new, reduced from F3)

```text
Purpose   Let one person propose an item for another person's target, and let the
          recipient record a private judgment they can revise. A proposal never
          becomes anything else by itself.

Types     external Person, external Target, external Item
          Fit is PENDING or MATCH or PARTIAL or MISS

State     a set of Pitches with
            a contributor Person
            a recipient Person
            a target Target
            an item Item
            a note String
            a fit Fit
            a response String
            unique target and item
          Rule: A new pitch is PENDING with an empty response.

Actions   pitch(contributor, recipient, target, item, note) : (pitch)
            refuses SELF_PITCH       where contributor is recipient
            refuses ALREADY_PITCHED  where a pitch exists for target and item
          withdraw(contributor, pitch)
            refuses UNKNOWN_PITCH, NOT_CONTRIBUTOR, ALREADY_REVIEWED
          review(recipient, pitch, fit, response)
            refuses UNKNOWN_PITCH, NOT_RECIPIENT, INVALID_REVIEW (fit is PENDING)
          clearTarget(target)

Queries   _get(pitch), _forTarget(target)
```

Two changes from F3, both to record in the design notes:

- **`recipient` is stored.** F3's `review` took no actor and relied on the composition to check ownership. The engine's guide says a security-critical decision must be enforced by the action that owns the state, so that a direct call cannot bypass it. The composition supplies the recipient from `Associating._get` when the pitch is made. A word's owner never changes, so the copy cannot go stale; Associating remains the authority.
- **Pitch visibility and `responseShared` are deferred** ([Section 4](#deferred-and-where-each-deferral-is-recorded)). A pitch gains an optional contributor note.

### Application types

```text
concrete Track
  A reference to one track in the verified catalog, such as soundcloud:293.

instantiate Annotating with
  Author is UserAuthenticating.User, Item is Track, Context is Associating.Association

instantiate Pitching with
  Person is UserAuthenticating.User, Target is Associating.Association, Item is Track
```

## 8. Compositions, endpoints, and authorization

Route names below are proposals. Settle them while writing the reactions, document them in the composition files, and regenerate the contract. Every route takes its actor from the session cookie. No route accepts a user identity in the body.

### Routes

Existing routes keep their paths: `/auth/register`, `/auth/login`, `/auth/me`, `/auth/logout`, `/wall/list`, `/wall/associate`, `/wall/update`, `/wall/visibility`, `/wall/remove`, `/wall/public`.

| Route | Who | Checks before acting | Then |
| --- | --- | --- | --- |
| `/wall/examples/add` | Owner | Session. Word belongs to actor. Track is in the catalog. Qualities are in the vocabulary, at most five. Note at most 280 characters. | `Annotating.annotate` |
| `/wall/examples/update` | Owner | Session. Word belongs to actor. Annotation is in that word. Same input bounds. | `Annotating.update` |
| `/wall/examples/visibility` | Owner | Session. Word belongs to actor. Annotation is in that word. | `Annotating.setVisibility` |
| `/wall/examples/remove` | Owner | Same. | `Annotating.remove` |
| `/suggestions/send` | Signed-in visitor | Session. Word exists and is public (else not found). Track is in the catalog. Note at most 280 characters. | `Pitching.pitch` with the word's owner as recipient |
| `/suggestions/sent` | Signed-in person | Session. | Actor's own pitches across all words: recipient, track, note, and **Waiting** or **Reviewed** only |
| `/suggestions/withdraw` | Contributor | Session. | `Pitching.withdraw` |
| `/suggestions/review` | Owner | Session. | `Pitching.review` with actor as recipient |
| `/suggestions/promote` | Owner | Session. Pitch has actor as recipient and fit `MATCH`. Same bounds as add. | `Annotating.annotate` as a private `EXAMPLE` |

Changes to existing reads:

- `/wall/list` adds `qualities` to each example and a `suggestions` list to each word: pitch, contributor's username, track, note, fit, and response.
- `/wall/public` adds `qualities` to each shared example and nothing else. It stays free of any session input, so it can never return something that depends on who is asking.
- `/wall/remove` also runs `Pitching.clearTarget`.
- Two repair reactions, triggered by a successful `Annotating.annotate` and `Pitching.pitch`, clear the context or target when the word no longer exists ([D3](#d3-no-cross-concept-transactions-owner-constraints-plus-one-repair-reaction)).

Put the example routes in the existing Sound Wall composition and the suggestion routes in a new `Suggestions` composition, each with its document in [design/compositions/](../design/compositions/) and its module in [src/compositions/](../src/compositions/).

### Who can do what

| Operation | Signed out | Signed-in visitor | Word owner |
| --- | --- | --- | --- |
| Read a public word and its shared songs | Yes | Yes | Yes |
| Read a private word, a private song, or a note or quality on one | No | No | Own only |
| Create, edit, or remove a word | No | Own only | Own only |
| Add, edit, share, or remove an example | No | No | Own only |
| Suggest a song for a public word | Asked to sign in | Yes | No (`SELF_PITCH`) |
| See a suggestion | No | Own only, without the review | All for own words |
| Review a suggestion or add a match to examples | No | No | Own words only |
| Withdraw a suggestion | No | Own, until reviewed | — |

### Errors

Add each new refusal to `publicErrors` in [http.ts](../src/http.ts). Two rules:

- **One meaning per category per route.** The browser sees categories such as `CONFLICT`, not refusal codes. Choose mappings so that on any one route a category means one thing. Where two refusals would collide, let the interface prevent one of them (for example, **Add to examples** is offered only on a saved match).
- **Never distinguish “private” from “missing.”** Both return `NOT_FOUND`.

## 9. Front-end structure

The current front end works, but two of its habits will not survive the new features. `web/components/SoundWall.ts` (since replaced) already holds four responsibilities in 491 lines, and [wall.ts](../web/wall.ts) explains every error with one table. Restructure before adding screens, not after.

### Layers

```text
web/
  api.ts                 typed client (unchanged)
  route.ts               URL ↔ view: wall, word; pushState and popstate
  account.ts             session state; register, sign in, sign out
  wall.ts                the signed-in person's words and examples
  publicWall.ts          another person's public wall
  suggestions.ts         sending, withdrawing, reviewing, promoting
  messages.ts            one message table per action
  components/
    AccountAccess        sign-in and registration form
    WordShelf            sleeves, search, filters
    AddWord              suggested words and a custom word
    WordPage             owner's view of one word; arranges the parts below
    DescriptionBlock     owner's text, or the draft, or the empty state
    ExampleCard          one song: track, qualities, note, visibility
    SongPicker           catalog list, preview, qualities, note
    QualityPicker        the chips
    TrackPlayer          the only component that knows about SoundCloud
    SharePanel           song ticks, make public, link, visitor preview
    SuggestionQueue      owner's review list
    PublicWord           visitor's view of one word; suggest and own suggestions
    ConfirmInline, Toast
shared/
  limits.ts              word, note, and quality bounds
  qualities.ts           the offered vocabulary, by group
  catalog.ts             verified tracks
  draft.ts               the draft-description function
```

### Rules

1. **Components do not call the API.** They receive data and action functions from a composable. Today `AccountAccess` calls `api.auth.register` directly; move it into `useAccount`.
2. **Composables own server state.** Each action function returns nothing on success or a message string on failure, as `useWall` does now. After a successful write the composable reloads its projection quietly, which is what keeps the page current without a refresh.
3. **Messages belong to actions.** `messages.ts` holds a table per action, so `CONFLICT` reads “That song is already in this word” when adding a song and “You already have this word” when creating one. Unknown errors fall back to a sentence that names the action and offers a retry.
4. **Types come from the contract.** Derive `Word`, `Example`, and the rest from `SoundItOutWireHttp` in [generated/wire.ts](../generated/wire.ts), as [account.ts](../web/account.ts) already does. Delete the hand-written copies in [wall.ts](../web/wall.ts), which have already loosened `role` and `visibility` to `string`.
5. **One source for each limit.** `MAX_WORD` is defined in both `web/components/SoundWall.ts` (since replaced) and [compositions/SoundWall.ts](../src/compositions/SoundWall.ts). Both import from `shared/limits.ts`. The browser checks limits to give a fast, specific message; the server checks them because it must.
6. **The browser never decides access.** It hides controls a person cannot use, and the server refuses them anyway. The tests in [Section 13](#13-testing-and-validation) call the routes directly to prove it.
7. **The Back button works.** Opening a word pushes a history entry; Back closes it. Today the app uses `replaceState` only.

## 10. Interaction design

### The difficulty this design takes off the user

Two tasks in this app are hard for a person and easy to get wrong in an interface.

**Saying what a word sounds like.** Most people cannot write “airy vocals over soft drums.” They can recognize it. So the app never asks for prose. It asks for a song, then offers things the person might be hearing. The description assembles itself above the songs as they tap, so they see what their picks say while they are picking.

**Knowing who can see what.** A word, a song, a note, a suggestion, and a review each have their own audience. The app never asks the owner to hold that model in their head. Every item carries its audience in words (**Only you**, **Shared**), and the Share panel shows the actual visitor's view before and after each change.

### Screens

**Wall (signed in).** Record-shelf of words. Each sleeve shows the word, a song count, **Private** or **Public**, and a suggestion count when there is one. One primary action: **Add word**. Search appears from six words up.

**Add word.** Eight suggested words as chips, and a field for a custom word. Choosing either creates the word and opens its page with the song picker already open. Typing a word the person already has offers to open it, as the form does today.

**Word page (owner).** Top to bottom, in the order a person needs them:

1. The word, with a status line: *Private — only you can open this* or *Public — 2 of 3 songs shared*.
2. The description block.
3. **Examples**, with **Add a song**.
4. **Suggestions**, when any exist.
5. **Share**, then **Rename** and **Remove word**, quietly.

**Description block.** Three states:

| State | What the owner sees | Actions |
| --- | --- | --- |
| No qualities picked, nothing written | *Pick what you hear in a song and a description writes itself. Or write your own.* | **Write your own** |
| Draft available, nothing written | The draft, labeled **Draft from the qualities you picked** | **Write your own** (opens the editor with the draft as a starting point) |
| Owner has written one | Their text, unlabeled | **Edit**, **Use the draft instead** (asks first: *Replace your description with the draft? Your text will be deleted.*) |

**Song picker.** Used for adding an example, sending a suggestion, and adding a match to examples, so the three behave alike. A list of catalog tracks with title, artist, and a play button; a filter field from nine tracks up. Selecting a track opens it in place: the player, then **What do you hear? (optional)** with chips in four groups and a count (*3 of 5*), then **Anything else? (optional)**, then the commit button, which names its effect: **Add to Dreamy** or **Send suggestion**. After adding, the picker stays open, the track is marked **Added**, and the draft above has already changed, so adding several songs in a row is one continuous motion. The picker says plainly that it is *a small library of tracks we have checked, not all of SoundCloud*.

**Share panel.** Opens in place on the word page.

1. **Songs visitors can see** — a tick per song. Each tick saves at once. The hint reads *Your note and the qualities you picked are shown with a shared song.*
2. **Make public** or **Make private**, with the consequence underneath. Making a word public with no songs ticked asks: *No songs are shared, so visitors will see only the word.* with **Share all 3 songs and make public**, **Make public without songs**, and **Cancel**.
3. The link with **Copy**, shown once the word is public.
4. **What visitors see** — the public view of this word, fetched from the public endpoint after every change.

The **Public** switch on each sleeve stays as a shortcut. Its toast reports the result and offers the next step: *Dreamy is public · 0 of 2 songs shared · Choose songs*.

**Public word (visitor).** The owner's name, the word, the description (a draft is labeled *From the qualities Alex picked*), and the shared songs. One primary action: **Suggest a song**. No edit controls. A signed-in visitor also sees **Your suggestions**, each marked **Waiting for Alex** or **Reviewed** (*Alex's review is private*).

**Suggestions (owner).** Each card shows the track, who suggested it, and their note. The three outcomes are buttons with text and a distinct icon each. A saved review can be changed. A match shows **Add to examples**; once the song is an example, the card shows **In your examples** instead. That state is read from the examples list, so removing the example brings the button back.

### Every state, on every screen

Build these with the feature, not afterward.

| Situation | What the person sees |
| --- | --- |
| Loading a wall or a public word | A status line naming what is loading |
| Saving | The pressed button shows its action in progress (*Adding…*) and is disabled; fields are read-only, not cleared |
| Saved | A toast naming the result and its audience (*Added “Song” · only you can see it*) |
| Failed to save | A message beside the control saying what was not saved and what to do; everything typed or picked is still there |
| Empty wall | The add-word form, as today |
| Word with no songs | The picker, open, under *Add a song that sounds dreamy to you* |
| Public wall with no public words | *Alex hasn't made any words public yet* |
| No suggestions | The Suggestions section is absent for the owner; a visitor sees the **Suggest a song** action |
| Track fails to load | *This track isn't loading here.* with **Open on SoundCloud**; the rest of the card still works |
| Track removed from the catalog | *This track is no longer available.* with the owner's qualities and note intact and **Remove** |
| Signed out, choosing a signed-in action | The sign-in form with the reason (*Sign in to suggest a song for Dreamy*); afterward the person is back where they were, with their chosen track kept |
| Session expired mid-action | *Sign in to continue* in place; the unsaved input is kept |

Returning a person to their place after sign-in needs a change: `useWall.open` currently resets the public wall and the open word when the account changes. Keep the `word` parameter and any chosen track across that transition.

### Mistakes

- **Destructive actions ask first, in place,** in the pattern the app already uses for removing a word. Each confirmation names what will be lost: *Remove this song from Dreamy? Your note and picked qualities will be deleted.*
- **Nothing becomes visible by accident.** New words and new examples start private. Promotion makes a private example.
- **Reviews and suggestions can be taken back.** A review can be changed; a suggestion can be withdrawn until it is reviewed, and the reason it can no longer be withdrawn is stated.
- **Unsaved text is guarded.** Keep the existing discard prompts and `beforeunload` warning, and extend them to the description editor and the picker's note.

### Access

Every control is reachable and operable by keyboard with visible focus. Chips are toggle buttons with `aria-pressed`. Outcomes and audiences are stated in text, never by color alone. Toasts use `role="status"`; errors use `role="alert"`. Moving to a new view moves focus to its heading, as the app does now. Each player frame has a title naming its track. Test with a keyboard and at 390 pixels wide, and say in the README what was tested. Do not claim conformance to a standard we have not audited against.

## 11. Visual design

The [F3 visual study](sound-it-out-f3.md#visual-design-study) set the direction: a quiet, warm interface in which the music carries the color. Keep it. What follows makes it systematic and fixes four measured problems.

### Hierarchy on the word page

A person should take in the page in this order without reading it all:

1. **The word** — the largest text on the page, on the record.
2. **The description** — body size, full ink, directly beneath.
3. **Songs** — cards of equal weight; track titles in semibold.
4. **Suggestions** — visibly not yet part of the collection.
5. **Actions** — one violet button per view; everything else outlined or text.

### Tokens

Colors are already tokens. Add scales for the other three dimensions so that every rule draws from a short list.

| Dimension | Now | Target |
| --- | --- | --- |
| Type sizes | 8 fixed sizes and 4 fluid ones | Six: page heading (fluid 32–44px), word (fluid 28–38px), section heading 20px, body 16px, control and chip 14px, metadata 13px. Section labels are 12px semibold uppercase, used only as labels. |
| Spacing | Ad hoc values (`0.35rem`, `0.45rem`, `0.6rem`, `0.7rem`, `0.85rem`…) | `--space-1` to `--space-7`: 4, 8, 12, 16, 24, 32, 48px |
| Corner radius | Six values | Three: 6px for fields, 12px for cards and panels, pill for buttons and chips |
| Buttons | `.primary`, `.action`, `.text-button`, `.filter`, plus unused `.secondary` | Three ranks: **primary** (filled violet, one per view), **action** (outlined), **text**. Danger is a color applied to primary inside a confirmation only. |

Spacing does the grouping: 8px within a group (a label and its field, a title and its artist), 16px between groups in a card, 32px between sections. If a gap between two unrelated things is smaller than a gap inside either, fix the gap.

### Color and state

| Token | Value | Use |
| --- | --- | --- |
| Canvas, Surface | `#FBF8F4`, `#FFFDFB` | Page and cards |
| Ink, Muted | `#282132`, `#746C7D` | Text and supporting text |
| Accent | `#6B47CF` | The primary action, selected chips, focus |
| Cream | `#FFF7E6` | A word that still needs a song |
| Mint | `#E1F3E9` | An accepted example; a match |
| Peach | `#FBE3E2` | A counterexample; a partial match |

A suggestion is drawn on plain Surface with a dashed border and the heading *Suggested by Daniel*. It gains mint only when it becomes an example. That one difference is the visual statement of the product's central rule: a suggestion is not part of a definition until its owner says so.

### Four measured problems to fix

Contrast ratios computed from the current token values:

| Pair | Ratio | Where | Fix |
| --- | --- | --- | --- |
| Muted on Mint | 4.35 : 1 | The *Shared* / *Private note* line inside every example card | Use Ink for metadata on tinted cards, or darken Muted to about `#6A6273` and recheck every pair |
| Muted on Peach | 4.11 : 1 | The same line on counterexample cards | Same |
| White on Vinyl `#8C6FD4` | 3.93 : 1 | Any body-size text placed on the disc color | Use white on Vinyl only at 24px and above, or use Accent (6.13 : 1) |
| Field border `#8E8596` on white | 3.53 : 1 | Inputs | Passes the 3 : 1 threshold for control boundaries; leave it, and do not lighten it |

Body text needs 4.5 : 1. Recompute after any palette change and save the table in the verification folder.

### The example card

The card is the densest component and appears on four screens, so compose it once.

```text
┌──────────────────────────────────────────────────────────┐
│ ▶  Track title                              Only you     │  title semibold 16px · audience 13px
│    Artist name                                           │  muted 14px
│                                                          │
│  airy vocals   soft drums                                │  chips, 14px, read-only
│                                                          │
│  The chorus feels like it's underwater.                  │  note, body 16px
│                                                          │
│  Edit · Remove                                           │  text buttons, owner only
└──────────────────────────────────────────────────────────┘
```

The SoundCloud player loads inside the card only when the person presses play. A page of ten idle players is slow and visually loud; a page of ten play buttons is neither. Give the frame a fixed height so the card does not jump when it loads.

### What to clean up

These class selectors in [styles.css](../web/styles.css) match nothing in any template: `.choices`, `.face`, `.flip`, `.flip-inner`, `.liner`, `.liner-top`, `.liner-word`, `.liner-share`, `.liner-remove`, `.record-copy`, `.record-head`, `.secondary`, `.stage-remove`, `.turn-over`, `.word-card`. Delete them and their rules, then check the short names a text search cannot settle (`.record`, `.disc`, `.back`, `.quiet`, `.status`, `.actions`). Do this in its own commit before adding new styles.

## 12. Music and descriptions

### What the SoundCloud documentation supports

- **Embedding.** The documented player URL is `https://w.soundcloud.com/player/?url=` followed by the encoded track URL; the documented example uses the form `https://api.soundcloud.com/tracks/<id>`. Whether a `soundcloud.com/artist/track` page URL works in that parameter is not stated on the Widget API page. Use the documented form.
- **Control.** Loading `https://w.soundcloud.com/player/api.js` provides `SC.Widget(iframe)` with `play`, `pause`, and `seekTo(milliseconds)`, and events including `READY`, `PLAY`, `FINISH`, and `ERROR`. Calls are asynchronous. By default, starting one player on a page pauses the others.
- **Availability.** A public track can still be preview-only, blocked, or region-restricted. A URL that looks valid is not evidence that a given visitor can play it.
- **API access.** The registration page says an Artist Pro subscription is required to register an app. Search and URL resolution need application credentials, and the client secret must stay on the server.
- **Terms.** The API terms restrict copying content and using API user content as AI input without the stated permissions. Embedding does not grant either right. Review the current terms and attribution rules before launch.

### The catalog

`shared/catalog.ts` is a list of 15 to 25 tracks the team has individually checked. Each entry holds the track reference, title, artist, the track's SoundCloud page, and the date someone last confirmed it plays in the embedded player.

- The server accepts a track only if it is in the catalog. That check is also what makes it safe to build a player URL from a stored value: nothing a user typed ever reaches a frame's address.
- Take each track's numeric identity from SoundCloud's own embed code for that track. Do not use unofficial endpoints or scraped identifiers.
- A stored example whose track later leaves the catalog shows the **no longer available** state.
- Restrict frames to the player's origin with a `Content-Security-Policy: frame-src https://w.soundcloud.com` header in [serve.ts](../web/serve.ts). Do not add a `script-src` directive without testing: the app compiles Vue templates in the browser, which a strict script policy would block.

### The player

`TrackPlayer` is the only component that knows SoundCloud exists. It takes a track reference and renders a play button, then the frame. It reports three states to its parent: loading, ready, and failed. Treat the frame as failed if `ERROR` fires or `READY` has not arrived after a few seconds, and show the link to the track's page. Show the track's title, artist, and source link as required by SoundCloud's attribution rules.

### The draft function

`draft(label, examples, voice)` in `shared/draft.ts` returns a sentence or nothing.

- **Input.** The word as displayed; the examples in the projection, each with a role and qualities; and whether the reader is the owner (*For you*) or a visitor (*For Alex*).
- **Counting.** Only examples with the `EXAMPLE` role and at least one quality count. For each quality, count the examples that have it. Order qualities by that count, highest first, then by their position in the vocabulary, so the result does not depend on the order examples were added.
- **At most four qualities** appear in a sentence.

| Examples with qualities | Pattern | Result |
| --- | --- | --- |
| None | — | Nothing. The page shows the empty state. |
| One, or several that all share the same picks | *means A, B and C* | *For you, “Dreamy” means airy vocals and soft drums.* |
| Several; some quality is on more than half of them; others are not | *often means A, with B or C* | *For you, “Dreamy” often means airy vocals, with soft drums or layered synths.* |
| Several; no quality is on more than half | *can mean A, B or C* | *For you, “Hype” can mean a driving beat, heavy drums or a fast tempo.* |

Three properties hold for every input, and the tests check them directly: the result is nothing exactly when there are no qualities; every quality named in the result was in the input; and the same examples in a different order give the same sentence.

### The vocabulary

`shared/qualities.ts` holds about two dozen qualities in four groups. Every entry is a noun phrase that reads correctly after “means,” because the draft drops it straight into a sentence. A starting list for the team to adjust after watching people use it:

- **Vocals:** airy vocals, close vocals, soft vocals, powerful vocals, no vocals
- **Rhythm:** a driving beat, soft drums, heavy drums, a slow tempo, a fast tempo, a steady groove
- **Sound:** layered synths, warm bass, bright guitars, acoustic instruments, distorted guitars, a lo-fi texture
- **Feel:** lots of reverb, a sparse arrangement, dense layers, a gradual build, a calm mood, a tense mood, an uplifting mood

Removing a quality from the vocabulary later must not break stored examples: the card still shows it, and the picker stops offering it.

### Later: rewording with a model, and real audio description

Neither is in the MVP. If the team pursues them:

- A small text model could reword only what the owner picked or wrote. It cannot listen to an embed or infer sound from a title. Send it no SoundCloud audio, metadata, or artwork until the terms are confirmed to allow that use. Compare it with the template on a small set for faithfulness, invented claims, and latency before turning it on, and keep the template as the fallback when the model is down. A model on a developer's laptop is not a service the deployed app can reach.
- Describing audio needs recordings the team is licensed to analyze, a music-capable model, and its own feasibility study. Even then a model can describe a recording, but not why a person chose it.

## 13. Testing and validation

### What each level is for

| Level | Checks | Set up by |
| --- | --- | --- |
| Concept tests | Each concept's principle, then its variants: every refusal, normalization, identity, visibility defaults, and races | Concept actions only |
| Function tests | The draft function's patterns and its three properties | Direct calls |
| HTTP tests | Reactions, access control, projections, and error categories, with three actors: owner, another signed-in user, and nobody | Requests only |
| Browser journeys | The three journeys through the real interface against a real database | The interface only |
| Deployed check | The same browser journeys against the public URL | The interface only |
| People | Whether strangers can do the tasks unaided | Observation |

**No test writes to the database directly.** Today the HTTP test for the wall creates annotations by calling the concept instance, because no route exists. Once the example routes exist, change that setup to requests and drop the concept import from the file.

### Coverage to add

| Concept | Principle test | Variants |
| --- | --- | --- |
| Associating | (exists) | A word with no description is accepted; an empty word is still refused; a description can be cleared and the identity is unchanged |
| Annotating | An example with qualities and no note starts private and keeps its identity when edited | Qualities are trimmed, lowercased, deduplicated, and returned in order; an example with neither note nor qualities is valid; another author cannot edit qualities; the existing duplicate-race and clear-context tests still pass |
| Pitching | Daniel pitches, Alex reviews it as partial, revises to match; the pitch never changes anything else | Self-pitch refused; duplicate refused, including when two pitches race; a non-contributor cannot withdraw; a non-recipient cannot review; `PENDING` is not a valid review; withdraw after review refused; withdraw and review racing leave exactly one outcome; clearing a target leaves other targets' pitches |
| UserAuthenticating | (exists) | `_username` returns the stored display name, and no row for an unknown user |

HTTP tests, each with assertions on both the response and what the next read returns:

- The full journey A → B → C with Alex, Daniel, and a signed-out reader.
- Every route in the “who can do what” table called by each actor who must be refused.
- Suggesting for a private word and for a missing word return the same status and body.
- Suggesting a song that is a private example succeeds; promoting it reports a conflict and changes nothing.
- Promoting the same match twice, and twice at once, yields one example.
- After the owner writes a description, adding, editing, and removing examples leaves it byte-for-byte unchanged.
- Out-of-catalog tracks, out-of-vocabulary qualities, six qualities, and over-long notes are refused, and nothing is stored.

### Four risks that ordinary tests would miss

Each has a diagnosis, a correction, and a check designed to catch the problem if it returns.

#### Risk 1: a private field leaks through a public response

*Diagnosis.* The personal and public wall projections are two hand-written field lists in [SoundWall.ts](../src/compositions/SoundWall.ts). This brief adds `qualities` and `suggestions` to one and `qualities` to the other. The natural mistake is copying a field into the public list, or adding a new route that returns too much. A test that checks the fields we thought of cannot catch a field we did not.

*Check: the canary sweep.* One HTTP test fills every private place with a unique marker string through ordinary requests: a private word's label and description; a private example's note and qualities on a public word; a pitch note and a review response; another contributor's pitch. It then calls **every route** as a signed-out reader, as an unrelated signed-in user, and as a contributor, and asserts that no response body contains any marker the caller is not entitled to.

*Recurrence.* The sweep reads the list of routes from the assembled application (or, if that is not exposed, from the generated contract) and fails if any route is missing from its table. Someone who adds a route must decide, in the test, who may see what.

#### Risk 2: a song added while its word is being removed

*Diagnosis.* [D3](#d3-no-cross-concept-transactions-owner-constraints-plus-one-repair-reaction). The add reads the word, the removal runs, the add writes.

*Correction.* The repair reaction, plus the argument that an orphan is unreachable.

*Check.* A test runs add-example and remove-word concurrently for many fresh words. After both settle it asserts that no wall response mentions the word or the track and that `_forContext` for the removed word is empty. The test **counts the trials in which the add succeeded and the word was removed**, prints that count, and fails if it is zero, because a run that never produced the dangerous interleaving proves nothing.

*Limitation to state in the results.* The race is exercised by repetition, not forced. Record the trial count and the interleaving count with each saved run.

#### Risk 3: the draft says something the owner never picked

*Diagnosis.* A template with joining rules can drop, duplicate, or reorder items at its boundaries (one item, four items, five items, ties).

*Check.* Beyond the example tests, a generated test runs the function over many random sets of examples drawn from the vocabulary and asserts the three properties in [Section 12](#the-draft-function). It also asserts that a public projection's draft contains no quality that appears only on a private example.

#### Risk 4: it works locally and fails when deployed

*Diagnosis.* Three things differ on the public host. The API refuses any request whose `Origin` is not `PUBLIC_ORIGIN`, so one wrong character in that setting breaks every write while `/health` stays green. The session cookie is `Secure` with a `__Host-` prefix, which behaves differently over HTTPS than on `127.0.0.1`. And the player is a third-party frame whose behavior depends on the visitor's browser and region.

*Check.* The browser journeys take their base URL from the environment. Run them against the deployed URL after every deployment, with freshly named test accounts, and save the output with the commit hash. Check sign-in once by hand in Safari and Firefox on the public URL. A passing local run is not recorded as evidence about the deployment.

### Browser journeys

Three scripted journeys in a browser automation tool (Playwright is the recommendation; confirm it runs with the pinned Bun, or run it with Node): build a word from music, visit and suggest, and review and add. Each uses two browser contexts for two accounts, asserts on what is rendered, and reloads once at the end to confirm persistence. Throughout, the script never calls `page.reload()` between an action and the assertion about its result; that is the check for “no refresh needed.” For the player, assert that the frame's address is the catalog track's and that it reports ready within a timeout; mark that assertion as provider-dependent in the output.

Include the error paths that a demonstration would be tempted to skip: a duplicate word, a duplicate suggestion, signing in partway through suggesting, and a save that fails (block the request in the test and confirm the picks are still on screen).

### People

Follow the [F3 validation plan](sound-it-out-f3.md#4-validation-plan): at least three people from outside the team, in pairs where possible. Give the creator one request (*show a friend what “hype” means to you*) and the friend another (*suggest a song that fits*). Do not coach. Record completion, time, errors, and hesitations, and whether the friend's restatement of the word matches what the creator meant. Report what happened, including what failed. Three sessions are a qualitative signal and should be described as one.

### Saved results

Create `design/verification/` with a `README.md` that is a table: date, commit, what was run, the exact command, the result, and what the run does not show. Beside it, save the raw output of each run, named by commit. Move the “Verification in this branch” section of [alpha-integration.md](../design/alpha-integration.md) there and correct its test count. When a check fails, record the failure, the diagnosis, and the fix; do not replace the entry with the passing run.

## 14. Increments

Each increment is one or a few commits that leave the app working. The dates are the course milestones from F3: alpha on November 23, beta on November 30, final on December 7 and 9.

For every increment, in this order: change the specification; change the concept and its tests; change the composition and regenerate the contract; change the interface; run `bun run check` and `bun test`; use the feature in a browser; write the decision and the check in `design/decisions.md`; commit with a message that says what changed and why.

| # | Increment | Done when |
| --- | --- | --- |
| 0 | **True up.** Fix the three mismatches in [Section 2](#2-what-exists-today). Delete the unused styles. Create `design/decisions.md` and `design/verification/`. Check five catalog tracks in the embedded player, locally and from a deployed page. | Documents match the code; five verified tracks are recorded with dates |
| 1 | **Words without descriptions.** Associating change; suggested words; `shared/limits.ts`; per-action messages; types from the contract. | A word can be created with one tap; all existing tests pass with updated expectations |
| 2 | **Songs.** `Track` type; Annotating qualities and optional note; example routes; catalog; `TrackPlayer`, `SongPicker`, `ExampleCard`. Split `SoundWall.ts`. | Journey A through step 5 works on persisted data; the HTTP test sets up through requests |
| 3 | **Draft.** `shared/draft.ts`, its tests, `DescriptionBlock`. | The draft changes as songs change, with no refresh; an owner's text is never altered |
| 4 | **Sharing.** Share panel, word link, visitor preview, public word page with players; canary sweep. | Journey A complete; a signed-out reader sees only shared songs |
| | *Alpha cut. Deploy and run the deployed check before going further.* | |
| 5 | **Suggestions.** Pitching; `Suggestions` composition; repair reactions; suggest flow with sign-in return. | Journey B works with two accounts |
| 6 | **Review and promotion.** Review queue; add to examples; race tests. | Journey C works; promoting twice adds once |
| 7 | **People and polish.** User sessions; fixes from them; keyboard and narrow-screen pass; contrast table. | Findings and fixes recorded |
| 8 | **Submission.** README, recording, final deployed check. | [Section 15](#15-repository-deployment-and-submission) checklist complete |

Whatever lies beyond the cut at a submission goes in the README under limitations, in plain words. A smaller app that does what it says is worth more than a larger one that appears to.

### Reviewing generated code

Much of this will be written with a coding agent. Before building on any generated change:

1. Read the whole diff. Remove anything you cannot explain.
2. Confirm the specification changed first and the code matches it. Run `bun run check`, which fails if the generated contract is out of date.
3. Run the tests. Then break the behavior on purpose (comment out an ownership check) and confirm a test fails. Restore it.
4. Use the feature in a browser, including one failure path.
5. Note in the decision log what was generated, what you changed, and what you checked.

Keep commits small enough to review. The last commit on `main` changed 25 files and 3,245 lines under the message “implement associating”; split work like that into the specification, the concept with its tests, the composition with the regenerated contract, and the interface.

## 15. Repository, deployment, and submission

### README

A reader should be able to go from the README to a running app, the public URL, the recording, the specifications, and the test evidence without asking anyone. It needs, in this order:

1. One paragraph on what the app does **today**, the public URL, and the recording.
2. Who we are, with a link to [team.md](../team.md).
3. Run locally: the exact Bun version, the three commands, and a table of environment variables (`MONGODB_URL`, `PUBLIC_ORIGIN`, `PORT`, `HOST`) with their defaults. None is a secret.
4. Test: the commands, what each level covers, and a link to the saved results.
5. Design: the live specifications, this brief, the decision log, and the generated contract. A sentence saying F2 and F3 are submitted snapshots and `design/` is current.
6. Known limitations, stated plainly.

Then test it: clone into an empty directory on a machine that has never run the project and follow the README exactly. Fix whatever you had to guess.

### Housekeeping

- [team.md](../team.md) has no entry for Victor, mixes heading levels, and has typos. Fix it; the authors of a submission should be identifiable.
- Keep the root to what it holds now plus `shared/`. Scratch files, screenshots, and exported outputs go in `design/verification/` or stay out of the repository.
- No commented-out code, placeholder text, or debug output. The startup line in [main.ts](../src/main.ts) is operational and stays.
- If time allows, a continuous-integration job that runs `bun run check` and `bun test` against a MongoDB service proves the instructions on every push.

### Deployment

Follow the [course deployment guide](https://61040.github.io/fa26/resources/deploying-apps/). Use the root package, Bun, the `start` script, port 3000, and `/health` for the health check. Set `MONGODB_URL` to a persistent database and `PUBLIC_ORIGIN` to the exact public address, with `https` and no trailing slash. Because of [D3](#d3-no-cross-concept-transactions-owner-constraints-plus-one-repair-reaction), the database does not need to support transactions.

### Before calling a build ready

- [ ] Fresh clone runs by following the README.
- [ ] `bun run check` and `bun test` pass; output saved with the commit hash.
- [ ] Browser journeys pass against the public URL; output saved.
- [ ] Sign-in checked by hand in Safari and Firefox on the public URL.
- [ ] Each catalog track plays on the public URL; dates updated.
- [ ] Specifications, compositions, generated contract, and decision log match the code.
- [ ] The recording shows the deployed build at the submitted commit, with narration that names the team, walks journeys A to C including one error path, and says what is limited (a small checked library, whole tracks, drafts built from picks).
- [ ] README links the URL, the recording, and the saved results.
- [ ] The commit hash, URL, and recording link are submitted as the course asks.

## 16. How this maps to the course rubrics

For each rubric, the quality that marks the top level, where this brief addresses it, and the artifact a grader can open.

| Rubric | What the top level asks for | Where | Evidence to produce |
| --- | --- | --- | --- |
| Implementing a concept-based application | A difficult integration or modularity issue resolved with a refinement that simplifies the app without losing its purpose | [D1](#d1-the-draft-description-is-computed-on-read-and-never-stored) removes stored drafts and three races. [D3](#d3-no-cross-concept-transactions-owner-constraints-plus-one-repair-reaction) replaces a transaction requirement with owner constraints and one repair. [D2](#d2-qualities-live-inside-annotating-not-in-a-new-concept) declines a concept that would add coupling. | `design/decisions.md`; specifications and generated contract in step with code; commits that show each step |
| Testing and validating | A subtle or consequential risk targeted, with diagnosis, a justified correction, and a way to detect recurrence | [Four risks](#four-risks-that-ordinary-tests-would-miss): the canary sweep that fails on an unclassified route; the race test that fails when it did not exercise the race | `design/verification/` with raw outputs, including failures and their follow-up; the recording |
| Interaction design | A potentially confusing task made straightforward; an observer can see the difficulty removed | [Describing a sound by picking, not writing](#the-difficulty-this-design-takes-off-the-user); the Share panel with a true visitor preview | The recording; notes from user sessions |
| Visual design | Content unusually easy to grasp; a dense screen that feels composed | [Hierarchy, tokens, the example card](#11-visual-design), and the four contrast fixes | The deployed app; the saved contrast table |
| Professionalism | Exceptionally easy to navigate, understand, and reproduce | [README order, fresh-clone test, housekeeping](#15-repository-deployment-and-submission) | A README that a stranger can follow to a running app |

The lower levels of each rubric are covered by the rest: behavior that works without refresh ([Section 9](#9-front-end-structure)), access control on the server ([Section 8](#8-compositions-endpoints-and-authorization)), informative errors ([Section 10](#every-state-on-every-screen)), and tests set up through actions ([Section 13](#13-testing-and-validation)).

## 17. Open questions

These need a team decision. Each has a recommendation, and the work in [Section 14](#14-increments) assumes it.

1. **SoundCloud access.** Does anyone have an Artist Pro account and API credentials? *Recommendation:* proceed with the checked catalog either way, and confirm in increment 0 that embedding these tracks is within the embed terms. If embeds do not work from the deployed origin, stop and choose another rights-compatible source before building further.
2. **Are picked qualities enough?** The alternative, describing songs from their audio, is not available to us under the terms. *Recommendation:* yes, and watch in user sessions whether people use the chips and trust the draft.
3. **Whole tracks for the alpha?** *Recommendation:* yes ([D4](#d4-an-example-points-at-a-whole-track-excerpting-waits)). Revisit a saved start position for the beta, shown as a cue rather than a cropped clip.
4. **Storing the recipient on a pitch.** This departs from F3. *Recommendation:* adopt it, for the reason in [Section 7](#pitching-new-reduced-from-f3).
5. **One suggestion per word and track, across all contributors?** *Recommendation:* keep F3's rule for the alpha and revisit if user sessions show the refusal confusing people.
6. **Who owns which increment?** F3 assigned work by concept. The increments here cut across concepts. *Recommendation:* one owner per increment, with the F3 concept owner as reviewer.

## 18. Sources

Documentation read on November 22, 2026. Re-read provider terms before launch; this brief is not a substitute for that review.

- [SoundCloud Widget API](https://developers.soundcloud.com/docs/api/html5-widget): embed address, methods, events, and player parameters.
- [SoundCloud API guide](https://developers.soundcloud.com/docs/): authentication, public resources, and playback availability.
- [SoundCloud API registration](https://developers.soundcloud.com/docs/api/register-app): registration requirements and secret handling.
- [SoundCloud API rate limits](https://developers.soundcloud.com/docs/api/rate-limits).
- [SoundCloud API terms of use](https://developers.soundcloud.com/docs/api/terms-of-use): user content, attribution, copying, and AI restrictions.
- Sync engine documentation, installed with the project under `node_modules/@mit-sdg/sync-engine/docs/user/`: `design.md` (state ownership, concept boundaries, cross-concept invariants) and `reference/operations.md` (concurrency and atomicity).
- [Ollama Gemma 3 listing](https://ollama.com/library/gemma3) and [Transformers.js documentation](https://huggingface.co/docs/transformers.js/index): background for the deferred model option.
- [Course deployment guide](https://61040.github.io/fa26/resources/deploying-apps/).

## 19. Prompt for a coding agent

> Read `final-proj-deliverables/mvp-product-and-implementation-brief.md`, then the README, `design/`, `src/`, `web/`, and `tests/`. Section 2 of the brief describes the repository at one commit; confirm it against the current code and report any difference before changing anything. Treat the rest of the brief as the plan, not as a description of what exists.
>
> Work one increment from Section 14 at a time, in order, and stop after each for review. Within an increment: edit the concept specification, then the concept and its tests, then the composition; run `bun run check:design`, `bun run generate`, `bun run check`, and `bun test`; then change the interface. Follow decisions D1 to D7. In particular: do not store a generated description; do not add a concept for qualities; do not introduce cross-concept transactions; do not accept a track that is not in the catalog; and do not send any SoundCloud content to a model.
>
> Concepts must not import or call each other. Take the actor from the session in every protected reaction and never from the request body. Return the same not-found error for a private word and a missing one. Components must not call the API directly. Set tests up through actions and requests, never through database writes.
>
> After each increment, report what you changed, what you ran and its output, what you did not verify, and anything blocked by credentials, provider behavior, hosting, or an open question in Section 17. Do not report a deployment, a test result, or a user session that did not happen.
