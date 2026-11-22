# Annotating

## Purpose

Record how an item relates to a particular context, as an example or a counterexample,
together with whatever explanation its author chooses to give. The same item can relate
differently to different contexts. An author can share an annotation when they are
ready. The application decides which contexts a viewer can open and uses the
annotation's visibility when choosing what to show.

## Principle

Alex *annotates* a song as an example in their word “hype” and picks two qualities
they hear in it, without writing anything. The annotation starts private. Alex can
*update* it with a note, change the picked qualities, label it a counterexample,
*share* it, or *remove* it. The same song can have a separate annotation in another
word. Trying to add it twice to the same word is refused.

## Types

```types
external Author
  An opaque identity for the person making the annotation.
external Item
  An opaque identity for the thing being related.
external Context
  An opaque identity for the setting in which the relation applies.
Role is EXAMPLE or COUNTEREXAMPLE
Visibility is PRIVATE or SHARED
opaque Qualities
  The qualities of one annotation as callers supply and receive them: a list of text labels. State holds them as a set of String.
```

## State

```state
a set of Annotations with
  an author Author
  an item Item
  a context Context
  a role Role
  a note String
  a qualities set of String
  a visibility Visibility
  unique context and item

Rule: New annotations are PRIVATE.
Rule: Store the note with surrounding whitespace removed. A note may be empty.
Rule: Store each quality trimmed and in lowercase, without empty entries or repeats. An annotation may have no qualities. The concept does not interpret a quality.
```

## Actions

```actions
annotate(author: Author, item: Item, context: Context, role: Role, note: String, qualities: Qualities) : returns (annotation: Annotation)
  where an annotation already exists for item and context
  then
    refuses ANNOTATION_EXISTS "This item is already included here."
  where no annotation exists for item and context
  then
    create an annotation with author, item, context, role, the trimmed note, the normalized qualities, and PRIVATE visibility
    returns annotation

update(author: Author, annotation: Annotation, role: Role, note: String, qualities: Qualities) : returns ()
  where the annotation does not exist
  then
    refuses UNKNOWN_ANNOTATION "This annotation could not be found."
  where the annotation belongs to another author
  then
    refuses NOT_AUTHOR "You cannot edit another user's annotation."
  where the annotation belongs to author
  then
    replace its role, trimmed note, and normalized qualities and preserve its visibility and identity
    returns

setVisibility(author: Author, annotation: Annotation, visibility: Visibility) : returns ()
  where the annotation does not exist
  then
    refuses UNKNOWN_ANNOTATION "This annotation could not be found."
  where the annotation belongs to another author
  then
    refuses NOT_AUTHOR "You cannot edit another user's annotation."
  where the annotation belongs to author
  then
    set its visibility
    returns

remove(author: Author, annotation: Annotation) : returns ()
  where the annotation does not exist
  then
    refuses UNKNOWN_ANNOTATION "This annotation could not be found."
  where the annotation belongs to another author
  then
    refuses NOT_AUTHOR "You cannot edit another user's annotation."
  where the annotation belongs to author
  then
    remove it
    returns

clearContext(context: Context) : returns ()
  where true
  then
    remove every annotation for context
    returns
```

## Queries

```queries
_get(annotation: Annotation) : optional (author: Author, item: Item, context: Context, role: Role, note: String, qualities: Qualities, visibility: Visibility)
  Returns the annotation's contents and context, with its qualities in ascending order, or no rows when absent.

_forContext(context: Context) : many (annotation: Annotation, author: Author, item: Item, role: Role, note: String, qualities: Qualities, visibility: Visibility)
  Returns every annotation for context in unspecified order, each with its qualities in ascending order. Returns no rows when the context has none.
```
