# Managing examples

Opening a word on the personal Sound Wall lets its owner manage the examples already
attached to it. The signed-in session identifies the actor. The
[example and word ownership check](view:Examples.ExampleOnOwnedWord) reads the word's
owner and the annotation's context. A missing, mismatched, or inaccessible example
returns `UNKNOWN_ANNOTATION`. Annotating also checks authorship before changing a row.

- [Edit the explanation or its role](reaction:Examples.Update). A note must contain
  text. The change preserves the example's current visibility.
- [Share an example or make it private](reaction:Examples.SetVisibility). A visitor
  sees a shared example only while its word is public.
- [Remove an example](reaction:Examples.Remove). This removes the explanation from
  the word and leaves the excerpt available for use elsewhere.

```endpoints
Examples.Update at /examples/update
Examples.SetVisibility at /examples/visibility
Examples.Remove at /examples/remove
```

The [Sound Wall reading composition](SoundWall.md) provides the personal and public
projections. Attaching a new interval will use the word's identity, the selected
track and time range, and the same role and note fields once Excerpting is wired in.
