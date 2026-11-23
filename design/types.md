# Application types

Registering allocates every user identity. The server derives the user identity for
protected requests from the session cookie through Sessioning, whose subject is that
identity, and Authenticating keeps a password verifier for it. Other concepts receive
that opaque user identity through application reactions. Associating owns each word.
Annotating and Pitching receive the word as an opaque context or target, and a song as
an opaque item. Friending connects two users; the application reads it to decide who is
in the limited audience of a word.

An item is a whole track from the checked catalog. Annotating and Pitching never
interpret it, so when Excerpting joins the assembly, rebinding `Item` to an excerpt
identity changes this file and the code that builds the item, and no concept.

Every flow that starts, uses, or ends a session binds one
[current instant](computation:currentInstant) and passes it to Sessioning, so Sessioning
never reads a clock.

```types
concrete Track
  A reference to one track in the checked catalog, such as soundcloud:293.
```

```computations
currentInstant() : DateTime
  Produces the instant at which the current request is handled, bound once per flow.
```

```instances
instantiate Registering

instantiate Authenticating with
  User is Registering.User

instantiate Sessioning with
  Subject is Registering.User

instantiate Associating with
  User is Registering.User

instantiate Annotating with
  Author is Registering.User
  Item is Track
  Context is Associating.Association

instantiate Pitching with
  Person is Registering.User
  Target is Associating.Association
  Item is Track

instantiate Friending with
  Person is Registering.User
```
