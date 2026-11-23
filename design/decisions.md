# Design decisions

Significant changes made while building the MVP, why they were made, and how each was
checked. The [product brief](../final-proj-deliverables/mvp-product-and-implementation-brief.md)
proposed most of them; this log records what was actually built. [F3](../final-proj-deliverables/sound-it-out-f3.md)
is the submitted snapshot of the earlier design; the files under `design/` are the
current specification.

Each entry names the difficulty, the decision, what was rejected, and the check. Test
names refer to files under `tests/`; results are in [verification](verification/README.md).

## Start here: three refinements that made the app simpler

Each one replaced a harder design with a smaller one that still does the job. Each is
visible in the code and checked by tests.

| Refinement | Before | After | Where to see it |
| --- | --- | --- | --- |
| **The description is computed, not stored** ([D1](#d1-the-draft-description-is-computed-never-stored)) | A stored draft needs four mechanisms: a generated-or-edited flag, a revision number against stale writes, a refresh rule, and a rule keeping private songs out of a public draft. Each can fail. | One pure function, `draft()`, applied to whatever songs the reader may see. Nothing is stored, so nothing goes stale, nothing overwrites an edit, and a visitor's draft cannot mention a private song. | [shared/draft.ts](../shared/draft.ts); [tests/shared/draft.test.ts](../tests/shared/draft.test.ts) (500 random cases) |
| **One wall view for every reader but the owner** ([D8](#d8-friends-and-a-third-audience-for-a-word)) | Adding friends seemed to need a second projection for friends, one for the Friends page, and one for the owner's preview, each of which could leak or drift. | One former, `VisibleWall(user, levels)`. Strangers get `PUBLIC`, friends get `LIMITED` and `PUBLIC`. The visited wall, the Friends page, and the preview all use it. Friendship is read on each request, so ending one closes access at once. | [src/compositions/SoundWall.ts](../src/compositions/SoundWall.ts) (`VisibleWall`); [privacy.test.ts](../tests/integration/privacy.test.ts) covers friends with no new projection code |
| **Owner constraints instead of transactions** ([D3](#d3-no-cross-concept-transactions), [D9](#d9-an-add-that-loses-the-race-to-a-removal-says-so)) | F3 required every multi-concept request to be atomic. The engine provides no cross-concept transactions, and a database transaction would couple the concepts' storage and need a replica set. | Every rule that must not race sits in the concept that owns it, behind a unique index or conditional write. The one cross-concept relation has a repair reaction, an honest answer after a race, and a startup sweep. | [Case study](verification/case-study/README.md): failure before the fix, success after, and a regression test that was itself fixed |

## How the work progressed, and how each step was checked

The brief's [increments](../final-proj-deliverables/mvp-product-and-implementation-brief.md#14-increments)
were built in order. Most of increments 1 to 6 and the friends feature landed in **one
commit, `c69f4a0`**, because they were built in a single working session with a coding
agent and committed together. That commit is larger than it should have been. It is
kept as is, because teammates' work is built on top of it. This table records the order
the work inside it was done and what was checked before the next step started.

| Step | What changed | Checked before going on |
| --- | --- | --- |
| 1. Words without descriptions | Associating: description optional | Concept tests updated; spec grammar check |
| 2. Songs | `Track` type; Annotating qualities and optional note; Pitching concept; `/wall/examples/*` routes; checked catalog | 28 concept and draft tests; then the Sound Wall HTTP tests, rewritten to set up through requests only (4 tests, 77 assertions) |
| 3. Draft description | `shared/draft.ts` | Pattern tests and 500 random cases |
| 4. Suggestions and review | `Suggestions` composition; repair reactions | Suggestion, privacy-sweep, and race tests: 47 passing |
| 5. Tests that bite | — | Two deliberate mutations, each reverted: exposing unshared songs, and dropping a repair while accepting suggestions for private words. Each failed three tests. |
| 6. Interface | Composables, components, stylesheet | Browser journeys. The first runs found four defects that the other tests had passed (see "How generated code was checked"). |
| 7. Friends | Friending concept; `LIMITED` audience; `Friends` composition; Friends page | Friending concept tests, including two races; friends HTTP tests; the privacy sweep extended to a friend and to a stranger with a pending request (56 passing) |

Every later change is its own commit, and each message says what was checked:

| Commit | Change |
| --- | --- |
| `085c57b` | Decision log, verification results, README |
| `00af7cd` | Deployment settings and the updated development plan |
| `bb09f35` | The forced-race test (failing before the fix, passing after); the startup sweep; recovery journeys, which found two more defects; and the advisory review |
| `1c71a5f` | Stress test of the unanswered-request window: 0 of 500 |
| `ea11c8c` | Merge with teammates' work on `main`; what was superseded, and why |
| `38ecbd6` | (Bhadra) Song privacy kept when a sharing change fails |

## D1. The draft description is computed, never stored

**Difficulty.** People can recognize what they hear far more easily than they can
write it. The brief's first idea was to generate a description and store it on the
word, which needs a generated-or-edited flag, a revision number so a late write cannot
overwrite a newer one, a refresh rule, and a rule stopping private songs from feeding
a public description. That is four mechanisms guarding one sentence.

**Decision.** Associating stores only what the owner wrote, which may be empty. The
interface computes the draft with `draft()` in [shared/draft.ts](../shared/draft.ts)
from whatever songs it is showing. An empty description means "show the draft".

**What this removed.** Stale drafts (nothing is stored), overwritten edits (the draft
never writes), and leaks (a visitor's draft is computed from the visitor's view, which
holds only shared songs).

**Rejected.** Storing the draft with a flag and revision. Generating a second "public
draft" on the server.

**Checked by.** `tests/shared/draft.test.ts`: each sentence pattern, plus 500 random
cases asserting that the draft is silent exactly when nothing was picked, never names
an unpicked quality, and does not depend on song order. `sound-wall.test.ts` asserts
that adding, editing, sharing, and removing songs leaves a written description
byte-for-byte unchanged. The browser journey edits the description and then removes a
song.

## D2. Qualities belong to the annotation

**Difficulty.** Picked qualities are new state; a separate tagging concept looks more
modular.

**Decision.** `qualities` is a field of an annotation in [Annotating](concepts/Annotating.md),
and the note became optional. Annotating stores qualities as opaque text; the list of
qualities on offer is application vocabulary in [shared/qualities.ts](../shared/qualities.ts),
checked when a request arrives.

**Why.** Qualities have the same author, lifecycle, and visibility as the annotation
they describe. A separate concept would need two more cascades and a rule tying its
visibility to the annotation's, with nothing reused.

**Spec change.** Annotating's purpose changed from "preserve an explanation" to
"record how an item relates to a context, with whatever explanation its author
chooses to give". The `INVALID_NOTE` refusal was removed. Signatures use an opaque
`Qualities` type because the spec grammar has no list type for parameters.

## D3. No cross-concept transactions

**Difficulty.** F3 required every multi-concept request to be atomic. The sync engine
commits each action separately and does not transact across actions
(`node_modules/@mit-sdg/sync-engine/docs/user/reference/operations.md`).

**Decision.** Each decision that must not race lives inside the concept that owns the
state, backed by a unique index or a conditional write:

| Rule | Owner | Mechanism |
| --- | --- | --- |
| One word per person and label | Associating | Unique index |
| One annotation per word and song (so promoting twice adds once) | Annotating | Unique index |
| One suggestion per word and song | Pitching | Unique index |
| A suggestion cannot be both withdrawn and reviewed | Pitching | Withdraw deletes only where still pending |
| A friend request is answered once | Friending | Accept, decline, and cancel each claim the request by deleting it |

The one relation no concept owns, that every example and suggestion refers to a word
that exists, is recorded in the [Sound Wall](compositions/SoundWall.md#an-example-refers-to-a-word-that-exists)
and [Suggestions](compositions/Suggestions.md#a-suggestion-refers-to-a-word-that-exists)
documents in the form the engine's design guide asks for: owners, what breaks it,
what preserves it, how long it can be false, and what happens if repair fails.

**Rejected.** MongoDB multi-document transactions (would need a replica set on the
host and would couple the concepts' storage). Soft-deleting words. A lock per word
(does not hold across server processes).

**Checked by.** `tests/integration/removal-race.test.ts`, described in D9.

## D4. Whole tracks now; Excerpting later

**Difficulty.** F3 binds an example to a millisecond interval. Exact start and stop
through the embedded player is unverified.

**Decision.** An example points at a whole catalog track (`Track` in
[types.md](types.md)). Excerpting is not implemented. Annotating and Pitching never
interpret the item, so adding it later changes `types.md` and the code that builds the
item, and no concept.

## D5. One Share panel over two stored facts, changed in fail-closed order

**Difficulty.** Someone else sees a song only when they may open the word and the song
is shown. Two switches in two places is the easiest thing to build and the hardest to
understand.

**Decision.** One Share panel on the word page holds both choices and shows the view
the server actually returns, from `/wall/preview`, never a simulation in the browser.
When one action broadens access and shares songs, the song settings are saved before
the word opens to the new audience. Switching a public word to friends while sharing
songs narrows access first. A failure to save the narrower audience therefore leaves
each song's prior sharing setting in place.

**Bug found and fixed.** The browser journey chose "Your friends", cancelled the "no
songs are shown" question, and then could not choose it again: the radio stayed
selected although the word was still private. The panel now keeps its own selection
that resets to the saved audience on cancel or failure. The journey asserts the reset.

Two follow-up browser tests forced failures while hiding a song and while switching a
public word to friends. The song checkbox now returns to its last confirmed setting
when a change fails. The audience test opens the public address as a signed-out visitor
and checks that they cannot read the private song note after the failed change or the
successful retry.

## D6. A suggestion never reveals a private example

Suggesting a song that is already a private example is accepted. Refusing would tell
the contributor the example exists. The owner learns of the overlap when adding the
match, where the answer is "This song is already one of your examples." A word the
sender may not open and a word that does not exist give the same answer.

**Checked by.** `suggestions.test.ts` compares the two answers field by field.

## D7. A word's link is the wall plus the word

`/?wall=alex&word=dreamy` opens a word without a separate endpoint. The cost is that
renaming a word changes its link; the rename form says so.

## D8. Friends, and a third audience for a word

**Difficulty.** Public links let strangers in, and private words help nobody. The
product is about friends showing each other what they mean, so there was no way to see
a friend's words, find where to suggest songs, or share with friends only.

**Decision.** A new [Friending](concepts/Friending.md) concept: one person asks, the
other accepts or declines, and either can end it. Associating's visibility gained a
middle value, `LIMITED`. Associating does not know what the limited audience is;
binding it to "the owner's friends" is the application's decision in the
[Friends composition](compositions/Friends.md).

The refinement that kept this simple: every reader other than the owner reads a wall
through **one** former, `VisibleWall(user, levels)`. A signed-out visitor gets
`["PUBLIC"]`, a friend `["LIMITED", "PUBLIC"]`. The Friends page, the visited wall,
and the owner's preview all use it, so the views cannot drift apart, and the existing
privacy sweep covers friends without new projection code. Friendship is read at the
moment of each request; nothing about it is copied into a word, so ending a
friendship closes the friends' words immediately.

**Rejected.** Sharing with a list of named people per word (more state, more choices
for the owner). Making friendship a property of the wall rather than of two people.

**Interface.** A Friends page holds the social side in one place: requests waiting,
friends with the words each has opened to you, and the songs you suggested with
whether each was reviewed. A visited wall shows where you stand with its owner and the
one next step. Signing in on someone's wall keeps you there.

**Checked by.** `tests/concepts/Friending.test.ts` (principle, every refusal, an
accept racing a cancel, two people asking each other at once). `friends.test.ts` over
HTTP. The privacy sweep now includes a friend, a stranger with an unanswered request,
and a contributor who is not a friend. Journey B in the browser.

## D9. An add that loses the race to a removal says so

**Difficulty.** Racing an add against its word's removal showed that the add could
store the song after the word was gone and still answer "added". The repair reaction
cleared the song, but the person had been told it was saved.

**Decision.** Every endpoint that writes into a word (adding a song, sending a
suggestion, adding a match) answers with
[the word as read after the write](compositions/SoundWall.md#examples). A missing word
comes back as `{ label: null }`, and the interface says "This word was just removed,
so the song was not kept." A label means the word still existed after the write, so a
later removal clears the song as part of that removal.

**Rejected.** Answering `WORD_NOT_FOUND` from a branch after the write. The engine does
not allow a branch inside a branch, which this needs, because ownership is checked
before the write.

**Recovery if the repair fails.** A row the repair missed cannot be reached, but it
should not be left to argument. The server sweeps at every start (`src/maintenance.ts`).
Using only Annotating's and Pitching's queries (`_contexts`, `_targets`, added for this)
and Associating's `_get`, it finds songs and suggestions whose word no longer exists,
clears them through the concepts' own actions, and logs what it cleared. Clearing is
always safe, because word identities are never reused.

**Checked by.**
- A forced-race test over HTTP removes the word at the exact moment the song is
  written. It fails on the code before this decision and passes after; both outputs
  are saved in the [case study](verification/case-study/README.md), which also records
  that the first version of this test could not fail and how that was discovered.
- Two deterministic tests write after a word's removal through the engine and assert
  that the repair clears the write.
- `orphans.test.ts` reproduces the state a failed repair leaves, and asserts that the
  sweep clears it and nothing else.
- Two race tests run 60 trials each and print how many interleavings took each path.

## D10. The draft and the rest of the page use the same vocabulary

Quality labels are stored as shown on the chips, for example "driving beat". The draft
uses a noun phrase for each, such as "a driving beat", kept beside the label in
`shared/qualities.ts`. A quality later removed from the offer still displays and can
be unpicked.

## D11. Recovering from an ended session keeps the person's place

The browser journeys exercise recovery as well as success: a track that will not load,
a failed save, a session that ends mid-task, a duplicate suggestion, and a word removed
while someone is suggesting for it. Two defects surfaced:

- **Lost work after signing in again.** The interface said "What you entered on this
  page is still here", but signing in reloaded the wall with a full loading screen,
  which discarded the song, qualities, and note being added. Re-authentication now
  reloads quietly in place.
- **Losing one's place.** The sign-in form appeared at the top of a long page while
  the person was far down at their song. The form now scrolls into view and takes
  focus. After signing in, focus returns to the control the person last used, which
  is remembered from focus events because a button loses focus while it is disabled
  during a request.

A track that fails to load now hides its empty player instead of leaving a blank gap
above the message. Journey D asserts each of these.

## D12. A player that stalls says so

**Evidence.** In one run of the playback check, Blue Boi became ready, played half a
second, and then did not advance for 24 seconds. The check failed. The run before it,
and every run since, passed.

**Diagnosis.** The check now records when each player became ready and when sound
started. Blue Boi was played 12 more times: ready after 0.6 to 0.9 s, sound after 1.1
to 1.4 s, every time. Across all saved runs, that one stall happened once in about 55
plays, mid-play, after the track was ready. That points to a passing network delay, not
to the track or to the app. A probe also confirmed that, under Chrome's normal autoplay
rules, a person's click on play does start the sound, so silence after a click is not
expected.

**Correction.** The app showed nothing in that situation. A person would sit in front
of a silent player with no way forward. The player now waits 8 seconds after becoming
ready (normal start is about 1.3 s). If no sound has played by then, it shows "Not
playing? Press play in the player, or open it on SoundCloud."

**Checked by, and how a recurrence is detected.**
- Journey D blocks only the audio host, `playback.media-streaming.soundcloud.cloud`,
  so the player is ready but silent, and asserts the hint and its link.
- Journey A asserts that the hint does **not** appear while sound is playing.
- `bun run check:tracks` reports, for each track, when it became ready and when sound
  started. `--only "<title>" --repeat N` replays one track to diagnose it.

## D13. The music is quieter than the word

**Difficulty.** The densest screen, the song library, put 14 near-black play circles
and 14 outlined "Choose" buttons beside each other. They were the heaviest marks on
the page, louder than the word and its description, and "LAKEY INSPIRED" was printed
nine times. Every song card on a word repeated the same black circle. "Remove word"
looked exactly as weighty as "Share…" and "Rename", although it is the one action that
destroys data. A confirmation message could also cover the last row of buttons.

**Decision.**
- **Play buttons are light:** a violet glyph on a pale violet circle, filling with
  violet on hover. The accent now marks one thing everywhere: sound, choices, and the
  primary action.
- **The library is grouped by artist.** Each artist is named once, as a small label,
  with that artist's songs beneath it, the way a record shelf is organized.
- **"Choose" is a quiet text action**, so the only filled button in the library is the
  one that commits ("Add to Dreamy").
- **"Remove word" is red text**, set apart on the right, away from the everyday
  actions.
- **The page leaves room at the bottom** so a confirmation never covers a button.

**Before and after.** [Library before](verification/visual/library-before.png) ·
[after](verification/visual/library-after.png) ·
[word page before](verification/visual/word-before.png) ·
[after](verification/visual/word-after.png). In the after screens, the record and the
word are the strongest elements, and the eye goes from the word, to its songs, to the
one primary action.

**Checked by.** Contrast of the new pairs: the play glyph on its circle is 5.24:1 (icons
need 3:1), and red text on the page is 7.78:1. Both are now part of
`bun scripts/contrast.ts`. The browser journeys pass unchanged, which confirms that every
control kept its accessible name. Grouping first listed the whole library under each
artist; the journeys caught it.

## How generated code was checked

Most code in this increment was written with a coding agent. Before building on it:

1. Specifications were changed first; `bun run check` fails when the generated
   contract and the code disagree.
2. The tests were made to fail on purpose. Two mutations were run and reverted:
   - Returning unshared songs from the public wall failed three tests, including the
     privacy sweep.
   - Removing the example repair reaction and accepting suggestions for private words
     failed three tests, including the deterministic repair test.
3. The browser journeys found six real defects that unit and HTTP tests had passed:
   - Creating a word did not open it, because the add screen unmounted before it
     could navigate.
   - The share panel radio did not reset after cancel (D5).
   - The phone header broke words mid-word.
   - Track status text squeezed track titles on phones.
   - Signing in after a session ended discarded the person's unsaved song (D11).
   - Focus was not returned after signing in again (D11).
4. A test was made to fail on purpose by running it against the pre-fix code. That
   run is what exposed a regression test that could not fail
   ([case study](verification/case-study/README.md)).
5. Screens from each journey were reviewed at desktop and phone widths
   ([screens](verification/screens/)).
6. The 30 advisories from the engine's checker were each reviewed and explained
   ([advisories](verification/advisories.md)). `bun run check` fails on any new one.
7. `bun run check:mutations` plants 13 specific bugs one at a time, such as a missing
   access check, a leak, or a dropped repair. For each, it runs the tests that should
   notice, and fails if any planted bug goes unnoticed. All 13 are caught
   ([mutations](verification/mutations.md)). This replaces the two one-off mutations
   above with a check anyone can rerun.
