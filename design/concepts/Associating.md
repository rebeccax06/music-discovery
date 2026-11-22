# Associating

## Purpose

Give a person an editable, independent definition of a subjective label. One person's
interpretation cannot replace another's, and the same label cannot be defined twice
in one person's vocabulary.

## Principle

Alex defines "hype" as music with energetic percussion and a driving rhythm, but not
necessarily loud vocals. A friend can independently define "hype" as fast electronic
dance music. Each person retains their own definition. Alex can revise the word or its description
as their understanding changes or remove the word when it is no longer useful.
Changing Alex's definition never changes the friend's definition.

## Types

```types
external User
  An opaque identity representing the person defining a label.

Visibility is PRIVATE or PUBLIC
  Whether a definition is visible only to its owner or to anyone with its address.
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
Rule: Store descriptions with surrounding whitespace removed. An association's identity does not change when its label, description, or visibility changes.
```

## Actions

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
    returns association

update(user: User, association: Association, label: String, description: String) : returns ()
  where the association does not exist
  then
    refuses UNKNOWN_ASSOCIATION "This word could not be found."
  where the association belongs to a different user
  then
    refuses NOT_OWNER "You cannot edit another user's definition."
  where the normalized label is empty or the trimmed description is empty
  then
    refuses INVALID_ASSOCIATION "Provide a word and a description."
  where a different association already exists for the user and normalized label
  then
    refuses ASSOCIATION_EXISTS "You have already defined this word."
  where the association exists, belongs to the user, and the label and description are valid
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
