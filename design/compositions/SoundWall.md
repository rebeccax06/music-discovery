# Sound Wall

The Sound Wall is one person's musical vocabulary. The session identifies the only
actor who can [add a word](reaction:SoundWall.Definitions.Associate),
[rename it or revise its description](reaction:SoundWall.Definitions.UpdateWord),
[change who can open it](reaction:SoundWall.Definitions.SetVisibility), or
[remove it](reaction:SoundWall.Definitions.RemoveWord). The browser does not choose
that actor. Requests accept words of up to 40 characters and descriptions of up to
500. A description may be empty: the interface then shows a draft it computes from
the qualities picked for the word's examples, and nothing stores that draft. The
interface creates every word private. A word's visibility is `PRIVATE` (only its
owner), `LIMITED` (its owner and, in this application, the owner's friends), or
`PUBLIC` (anyone with its address).

[Removing a word](reaction:SoundWall.Definitions.RemoveWord) also clears the
annotations whose context is that word and the pitches whose target is it. The three
actions run in that order in one request and commit separately: the engine does not
transact across actions.

```endpoints
SoundWall.Definitions.Associate at /wall/associate
SoundWall.Definitions.UpdateWord at /wall/update
SoundWall.Definitions.SetVisibility at /wall/visibility
SoundWall.Definitions.RemoveWord at /wall/remove
```

## Examples

A word's owner [adds a song](reaction:SoundWall.Examples.AddExample) to it as an
example. Annotating accepts any context, so this reaction requires the word to belong
to the session's user; a word that is missing and a word that belongs to someone else
receive the same `WORD_NOT_FOUND` answer. The request must name a track from the
checked catalog, at most five qualities from the offered vocabulary, and a note of at
most 280 characters. The note and the qualities may both be empty. A new example is
private.

The owner can [change an example's role, note, and qualities](reaction:SoundWall.Examples.UpdateExample),
[share it or make it private again](reaction:SoundWall.Examples.SetExampleVisibility),
or [remove it](reaction:SoundWall.Examples.RemoveExample). Annotating enforces that
only an annotation's author may do these, and only a word's owner authors examples in
it, so these reactions pass the session's user as the author and let the concept
answer.

```endpoints
SoundWall.Examples.AddExample at /wall/examples/add
SoundWall.Examples.UpdateExample at /wall/examples/update
SoundWall.Examples.SetExampleVisibility at /wall/examples/visibility
SoundWall.Examples.RemoveExample at /wall/examples/remove
```

The answer to [adding a song](reaction:SoundWall.Examples.AddExample) includes
[the word as read after the write](former:SoundWall.Examples.WordAfterWrite): its
label, or `null` when the owner removed it in between. The interface then says the
word was removed and the song was not kept, instead of confirming the add. A label
means the word still existed after the song was stored, so a later removal of the
word clears the song as part of that removal.

### An example refers to a word that exists

No single concept owns this relation, so it is recorded here.

1. **Owners.** Associating owns words. Annotating owns examples.
2. **What can violate it.** An add reads its word, the owner removes the word and its
   examples, and then the add writes.
3. **What preserves it.** Removal clears the word's examples. In addition, after every
   successful annotation, [a repair reaction](reaction:SoundWall.Examples.ClearExamplesOfMissingWord)
   clears the context again when its word no longer exists. Clearing is idempotent.
4. **How long it can be false.** From the late write until the repair runs, within the
   same request flow.
5. **If the repair refuses or faults.** The example stays in storage and cannot be
   reached: every read starts from a word that exists, word identities are random and
   never reused, and adding the same label again creates a new identity. The person
   who added it was told the word no longer exists, so nothing claims it was saved.
   The server sweeps for such rows at every start, using Annotating's `_contexts`
   query and its `clearContext` action, and logs what it clears.
6. **Automatic.** Yes.

## Reading

The [personal wall](reaction:SoundWall.Reading.ListWall) uses the
[owner's vocabulary](former:SoundWall.Reading.PersonalWall). It lists every word
that person has, in displayed-label order. Each word carries every example on it,
with its track, role, note, qualities, and visibility, in annotation-identity order,
and every suggestion made for it, with the contributor's username, track, note, fit,
and the owner's response, in pitch-identity order.

Everyone other than the owner reads a wall through
[one former](former:SoundWall.Reading.VisibleWall), which takes the visibility
levels the reader may open. It lists the owner's words at those levels in
displayed-label order, each with only the examples marked shared, in
annotation-identity order. A shared example carries its track, role, note, and
qualities. Private words, unshared examples, and every suggestion and review never
appear. Because friends and strangers read through the same former with different
levels, the two views cannot drift apart.

- A visitor can [open a public wall](reaction:SoundWall.Reading.ReadPublicWall) by
  its username address without an account. The request takes no session, so the
  answer cannot depend on who is asking, and it passes only `PUBLIC`. An unknown
  username [finds no wall](reaction:SoundWall.Reading.MissingWall).
- A signed-in person [visits a wall](reaction:SoundWall.Reading.VisitWall). When
  Friending says the visitor and the owner are friends, the former receives `LIMITED`
  and `PUBLIC`; otherwise only `PUBLIC`. The check is made at the time of the
  request, so ending a friendship closes the friends' words at once.
- The owner can [preview their wall](reaction:SoundWall.Reading.PreviewWall) as
  friends and as everyone else receive it. The preview is the same former with the
  same levels, so it shows what those readers actually get.

```endpoints
SoundWall.Reading.ListWall at /wall/list
SoundWall.Reading.ReadPublicWall at /wall/public
SoundWall.Reading.MissingWall at /wall/public
SoundWall.Reading.VisitWall at /wall/visit
SoundWall.Reading.PreviewWall at /wall/preview
```
