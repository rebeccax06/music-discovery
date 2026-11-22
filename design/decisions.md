# Design decisions

Significant changes made while building the MVP, why they were made, and how each was
checked. The [product brief](../final-proj-deliverables/mvp-product-and-implementation-brief.md)
proposed most of them; this log records what was actually built. [F3](../final-proj-deliverables/sound-it-out-f3.md)
is the submitted snapshot of the earlier design; the files under `design/` are the
current specification.

Each entry names the difficulty, the decision, what was rejected, and the check. Test
names refer to files under `tests/`; results are in [verification](verification/README.md).

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
When one action changes both, songs are shared first and the word opened second, so a
failure partway leaves less visible than intended. The record-shelf "Public" switch was
removed: with three audiences it could not say which one it meant.

**Bug found and fixed.** The browser journey chose "Your friends", cancelled the "no
songs are shown" question, and then could not choose it again: the radio stayed
selected although the word was still private. The panel now keeps its own selection
that resets to the saved audience on cancel or failure. The journey asserts the reset.

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

**Accepted limitation.** If the repair reaction itself faults, the stray row stays in
storage. Nothing can reach it, and the person was told it was not kept.

**Checked by.** Two deterministic tests write after a word's removal through the
engine and assert that the repair clears it, and that without the repair nothing
reaches it. Two race tests run 60 trials each and print how many interleavings took
each path. One saved run caught the late write once, and that add was answered
"word gone".

## D10. The draft and the rest of the page use the same vocabulary

Quality labels are stored as shown on the chips, for example "driving beat". The draft
uses a noun phrase for each, such as "a driving beat", kept beside the label in
`shared/qualities.ts`. A quality later removed from the offer still displays and can
be unpicked.

## How generated code was checked

Most code in this increment was written with a coding agent. Before building on it:

1. Specifications were changed first; `bun run check` fails when the generated
   contract and the code disagree.
2. The tests were made to fail on purpose. Two mutations were run and reverted:
   - Returning unshared songs from the public wall failed three tests, including the
     privacy sweep.
   - Removing the example repair reaction and accepting suggestions for private words
     failed three tests, including the deterministic repair test.
3. The browser journeys found four real defects that unit and HTTP tests had passed:
   - Creating a word did not open it, because the add screen unmounted before it
     could navigate.
   - The share panel radio did not reset after cancel (D5).
   - The phone header broke words mid-word.
   - Track status text squeezed track titles on phones.
4. Screens from each journey were reviewed at desktop and phone widths
   ([screens](verification/screens/)).
