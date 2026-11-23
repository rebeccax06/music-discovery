# Pitching

## Purpose

Let one person propose an item for another person's target, and let that recipient
record a private judgment of the proposal that they can revise. A proposal stays a
proposal: judging it changes nothing else.

## Principle

Daniel *pitches* a song for Alex's word “hype” with a short note. The pitch is pending
until Alex *reviews* it. Alex marks it a partial match and notes that the drums fit
but the vocals are too intense, then later changes the review to a match. Daniel can
see that his pitch has been reviewed but not what Alex decided. Had Daniel changed his
mind before the review, he could have *withdrawn* the pitch. A second pitch of the
same song for the same word is refused.

## Types

```types
external Person
  An opaque identity for someone who proposes an item or receives a proposal.
external Target
  An opaque identity for the thing a proposal is made for.
external Item
  An opaque identity for the thing proposed.
Fit is PENDING or MATCH or PARTIAL or MISS
```

## State

```state
a set of Pitches with
  a contributor Person
  a recipient Person
  a target Target
  an item Item
  a note String
  a fit Fit
  a response String
  unique target and item

Rule: A new pitch is PENDING with an empty response. A pitch that is not PENDING has been reviewed.
Rule: Store the note and the response with surrounding whitespace removed. Either may be empty.
Rule: A pitch's contributor, recipient, target, and item never change.
```

## Actions

```actions
pitch(contributor: Person, recipient: Person, target: Target, item: Item, note: String) : returns (pitch: Pitch)
  where contributor is recipient
  then
    refuses SELF_PITCH "You cannot suggest an item to yourself."
  where a pitch already exists for target and item
  then
    refuses ALREADY_PITCHED "This item has already been suggested here."
  where contributor is not recipient and no pitch exists for target and item
  then
    create a PENDING pitch with contributor, recipient, target, item, the trimmed note, and an empty response
    returns pitch

withdraw(contributor: Person, pitch: Pitch) : returns ()
  where the pitch does not exist
  then
    refuses UNKNOWN_PITCH "This suggestion could not be found."
  where the pitch belongs to another contributor
  then
    refuses NOT_CONTRIBUTOR "You cannot withdraw someone else's suggestion."
  where the pitch has been reviewed
  then
    refuses ALREADY_REVIEWED "This suggestion has already been reviewed."
  where the pitch belongs to contributor and is PENDING
  then
    remove the pitch
    returns

review(recipient: Person, pitch: Pitch, fit: Fit, response: String) : returns ()
  where the pitch does not exist
  then
    refuses UNKNOWN_PITCH "This suggestion could not be found."
  where the pitch was made to another recipient
  then
    refuses NOT_RECIPIENT "Only the person this was suggested to can review it."
  where fit is PENDING
  then
    refuses INVALID_REVIEW "Choose a fit."
  where the pitch was made to recipient and fit is not PENDING
  then
    set its fit and its response to the trimmed response
    returns

clearTarget(target: Target) : returns ()
  where true
  then
    remove every pitch for target
    returns
```

## Queries

```queries
_get(pitch: Pitch) : optional (contributor: Person, recipient: Person, target: Target, item: Item, note: String, fit: Fit, response: String)
  Returns the pitch's contents, or no rows when absent.

_targets() : many (target: Target)
  Returns every target that has at least one pitch, each once, in unspecified order. Returns no rows when there are no pitches.

_forTarget(target: Target) : many (pitch: Pitch, contributor: Person, item: Item, note: String, fit: Fit, response: String)
  Returns every pitch for target in unspecified order. Returns no rows when the target has none.

_sentBy(contributor: Person) : many (pitch: Pitch, recipient: Person, target: Target, item: Item, note: String, reviewed: Flag)
  Returns what a contributor may know about their own pitches, in unspecified order: each pitch, whom and what it was for, its item and note, and whether it has been reviewed. It omits the fit and the response. Returns no rows when the contributor has pitched nothing.
```
