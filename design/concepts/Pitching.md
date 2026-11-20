# Pitching

## Purpose

Let a contributor propose an item for consideration and let the recipient record a private, revisable response to that proposal.

## Principle

Daniel proposes a song interval for Alex's “hype.” The pitch is pending until Alex reviews it. Alex marks it a partial match and notes that the drums fit but the vocals are too intense. This response is private unless Alex shares it with Daniel. If Daniel changes his mind before the review, he can withdraw the pitch. A review does not itself add the song to Alex's examples.

## Types

```types
external Contributor
external Target
external Item
```

## State

```state
Fit is PENDING or MATCH or PARTIAL or MISS
Visibility is PRIVATE or PUBLIC

a set of Pitches with
  a contributor Contributor
  a target Target
  an item Item
  a visibility Visibility
  a fit Fit
  a response String
  a responseShared Flag
  unique target and item

Rule: A new pitch is PENDING, with an empty response and responseShared false.
Rule: A new or changed response is not shared, even if the previous response was shared.
```

## Actions

```actions
createPitch(contributor: Contributor, target: Target, item: Item, visibility: Visibility) : returns (pitch: Pitch)
  where a pitch already exists for target and item
  then
    refuses ALREADY_PITCHED "This item has already been pitched here."
  where no pitch exists for target and item
  then
    create a pitch with contributor, target, item, visibility,
      PENDING fit, empty response, and responseShared false
    returns the pitch

deletePitch(contributor: Contributor, pitch: Pitch) : returns ()
  where the pitch does not exist
  then
    refuses PITCH_NOT_FOUND "This pitch could not be found."
  where the pitch belongs to another contributor
  then
    refuses NOT_CONTRIBUTOR "You cannot withdraw someone else's pitch."
  where the pitch has already been reviewed
  then
    refuses ALREADY_REVIEWED "This pitch has already been reviewed."
  where the pitch exists, belongs to contributor, and is PENDING
  then
    remove the pitch

review(pitch: Pitch, fit: Fit, response: String) : returns ()
  where the pitch does not exist
  then
    refuses PITCH_NOT_FOUND "This pitch could not be found."
  where fit is PENDING
  then
    refuses INVALID_REVIEW "Choose a fit."
  where the pitch exists and fit is not PENDING
  then
    set its fit to fit and response to the trimmed response
    set responseShared to false
    returns

setVisibility(contributor: Contributor, pitch: Pitch, visibility: Visibility) : returns ()
  where the pitch does not exist
  then
    refuses PITCH_NOT_FOUND "This pitch could not be found."
  where the pitch belongs to another contributor
  then
    refuses NOT_CONTRIBUTOR "You cannot change someone else's pitch."
  where the pitch exists and belongs to contributor
  then
    set its visibility to visibility
    returns

setResponseShared(pitch: Pitch, shared: Flag) : returns ()
  where the pitch does not exist
  then
    refuses PITCH_NOT_FOUND "This pitch could not be found."
  where the pitch is PENDING and shared is true
  then
    refuses NOT_REVIEWED "There is no review to share."
  where the pitch exists and either it has been reviewed or shared is false
  then
    set responseShared to shared
    returns

clearTarget(target: Target) : returns ()
  where true
  then
    remove all pitches for target
    returns
```
