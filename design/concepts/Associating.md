# Associating

## Purpose

Give a person an editable, independent entry for a subjective label, with a description
in their own words when they choose to write one. One person's entry cannot replace
another's, and the same label cannot be entered twice in one person's vocabulary.

## Principle

Alex adds "hype" to their vocabulary without describing it yet. Later they describe it
as energetic percussion and a driving rhythm, but not necessarily loud vocals. A friend
can independently add "hype" and describe it as fast electronic dance music. Each person
retains their own entry. Alex can revise the word or its description as their
understanding changes, clear the description, or remove the word when it is no longer
useful. Changing Alex's entry never changes the friend's.

## Types

```types
external User
  An opaque identity representing the person defining a label.

Visibility is PRIVATE or LIMITED or PUBLIC
  Who may open an entry: only its owner, its owner and an audience the application defines, or anyone with its address.
```

## State

```state
a set of Associations with
  a user User
  a label String
  a normalizedLabel String
  a description String
  a visibility Visibility
  unique user and normalizedLabel

Rule: Compare labels after trimming surrounding whitespace, collapsing internal whitespace to a single space, and converting to lowercase. The stored label keeps the user's capitalization of that collapsed text. normalizedLabel stores the lowercase comparison form.
Rule: Store descriptions with surrounding whitespace removed. A description may be empty, which means its owner has not written one. An association's identity does not change when its label, description, or visibility changes.
```

## Actions

```actions
associate(user: User, label: String, description: String, visibility: Visibility) : returns (association: Association)
  where the normalized label is empty
  then
    refuses INVALID_ASSOCIATION "Provide a word."
  where an association already exists for the user and normalized label
  then
    refuses ASSOCIATION_EXISTS "You have already defined this word."
  where the normalized label is not empty and no association exists
  then
    create an association with the user, trimmed label, trimmed description, and visibility
    returns association

update(user: User, association: Association, label: String, description: String) : returns ()
  where the association does not exist
  then
    refuses UNKNOWN_ASSOCIATION "This word could not be found."
  where the association belongs to a different user
  then
    refuses NOT_OWNER "You cannot edit another user's definition."
  where the normalized label is empty
  then
    refuses INVALID_ASSOCIATION "Provide a word."
  where a different association already exists for the user and normalized label
  then
    refuses ASSOCIATION_EXISTS "You have already defined this word."
  where the association exists, belongs to the user, and the normalized label is not empty
  then
    replace the association's label and description with the trimmed values
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

## Queries

```queries
_byUser(user: User) : many (association: Association, label: String, description: String, visibility: Visibility)
  Returns every association defined by the given user, in ascending displayed-label order and then association identity. Returns no rows when that user has defined none.

_get(association: Association) : optional (user: User, label: String, description: String, visibility: Visibility)
  Returns the association's owner and definition, or no row when the association does not exist.
```
