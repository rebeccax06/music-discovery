# Suggestions

A signed-in person can suggest a song for a word they are able to open: anyone's
public word, or a friend's word that is limited to friends. The owner reviews the
suggestion privately and may, as a separate step, add a match to their examples. A
suggestion never changes a word's examples by itself.

## Sending

[Sending a suggestion](reaction:Suggestions.Sending.Send) requires a session, a word
the sender may open, a track from the checked catalog, and a note of at most 280
characters, which may be empty. Pitching accepts any target, so this reaction
decides who may suggest and passes the word's owner as the recipient. A word is open
to the sender when it is public, or when
[it is limited and Friending says the sender is the owner's friend](view:Suggestions.Sending.friendsWord).
A word the sender may not open and a word that does not exist receive the same
`WORD_NOT_FOUND` answer. Pitching itself refuses a suggestion to one's own word and a
second suggestion of the same track for the same word.

The reaction does not check whether the track is already one of the owner's
examples. If the example is private, refusing would reveal it.

A contributor can [list what they have sent](reaction:Suggestions.Sending.ListSent).
[That list](former:Suggestions.Sending.SuggestionsSent) carries, for each suggestion,
the recipient's username, the word's identity, the track, the note, and whether it
has been reviewed, in pitch-identity order. It never carries the fit or the owner's
response, and it does not carry the word's label, which the owner may since have
changed or hidden. A contributor can [withdraw](reaction:Suggestions.Sending.Withdraw)
a suggestion until it is reviewed; Pitching enforces both the contributor and the
timing.

```endpoints
Suggestions.Sending.Send at /suggestions/send
Suggestions.Sending.ListSent at /suggestions/sent
Suggestions.Sending.Withdraw at /suggestions/withdraw
```

Sending a suggestion and adding a match to one's examples answer with the word as read
after the write, as adding a song does in the [Sound Wall](SoundWall.md#examples). If
the word was removed in between, its label is `null` and the interface reports that
nothing was kept.

### A suggestion refers to a word that exists

1. **Owners.** Associating owns words. Pitching owns suggestions.
2. **What can violate it.** A suggestion reads its word, the owner removes the word
   and its suggestions, and then the suggestion writes.
3. **What preserves it.** Removing a word clears its suggestions. In addition, after
   every successful pitch, [a repair reaction](reaction:Suggestions.Sending.ClearSuggestionsOfMissingWord)
   clears the target again when its word no longer exists. Clearing is idempotent.
4. **How long it can be false.** From the late write until the repair runs, within the
   same request flow.
5. **If the repair refuses or faults.** The suggestion stays in storage and cannot be
   reached through a word. Its contributor can still withdraw it.
6. **Automatic.** Yes.

## Reviewing

The word's owner [reviews a suggestion](reaction:Suggestions.Reviewing.Review) as a
match, a partial match, or a miss, with a response of at most 280 characters, and can
review it again later. Pitching enforces that only the recipient may review. The
owner reads suggestions and their reviews through the personal wall; no other
reaction returns a fit or a response.

The owner can [add a reviewed match to their examples](reaction:Suggestions.Reviewing.Promote).
The reaction requires the pitch to have the session's user as its recipient and a
saved `MATCH`; anything else receives `NOT_A_MATCH`. It creates a private example
with the supplied note and qualities. Annotating allows one annotation per word and
track, so repeating the request, or sending it twice at once, adds one example and
answers the other with `ANNOTATION_EXISTS`. The pitch is left as it was: whether a
suggested track is among the examples is read from the examples.

```endpoints
Suggestions.Reviewing.Review at /suggestions/review
Suggestions.Reviewing.Promote at /suggestions/promote
```
