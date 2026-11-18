# Annotating

## Purpose

Preserve an author's explanation of how an item relates to a particular context. The
same item can support different interpretations in different contexts. An author can
share an explanation when they are ready. The application decides which contexts a
viewer can open and uses the annotation's visibility when choosing what to show.

## Principle

Alex *annotates* a song excerpt in their definition of “hype” and writes that the drums
build energy. The note starts private. Alex can *update* the note, label it a
counterexample, *share* it, or *remove* it. The same excerpt can have a separate note
in another definition. Trying to add it twice to the same definition is refused.

## Types

```types
external Author
  An opaque identity for the person providing the explanation.
external Item
  An opaque identity for the thing being explained.
external Context
  An opaque identity for the setting in which the explanation applies.
Role is EXAMPLE or COUNTEREXAMPLE
Visibility is PRIVATE or SHARED
```

## State

```state
a set of Annotations with
  an author Author
  an item Item
  a context Context
  a role Role
  a note String
  a visibility Visibility
  unique context and item

Rule: New annotations are PRIVATE.
```

## Actions

```actions
annotate(author: Author, item: Item, context: Context, role: Role, note: String) : returns (annotation: Annotation)
  where the trimmed note is empty
  then
    refuses INVALID_NOTE "Explain why this example matters."
  where an annotation already exists for item and context
  then
    refuses ANNOTATION_EXISTS "This item is already included here."
  where the note is valid and no annotation exists for item and context
  then
    create an annotation with author, item, context, role, the trimmed note, and PRIVATE visibility
    returns annotation

update(author: Author, annotation: Annotation, role: Role, note: String) : returns ()
  where the annotation does not exist
  then
    refuses UNKNOWN_ANNOTATION "This annotation could not be found."
  where the annotation belongs to another author
  then
    refuses NOT_AUTHOR "You cannot edit another user's annotation."
  where the trimmed note is empty
  then
    refuses INVALID_NOTE "Explain why this example matters."
  where the annotation belongs to author and the note is valid
  then
    update its role and trimmed note and preserve its visibility and identity
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
_get(annotation: Annotation) : optional (author: Author, item: Item, context: Context, role: Role, note: String, visibility: Visibility)
  Returns the annotation's contents and context, or no rows when absent.

_forContext(context: Context) : many (annotation: Annotation, author: Author, item: Item, role: Role, note: String, visibility: Visibility)
  Returns every annotation for context in unspecified order.
```
