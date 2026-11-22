# Application types

The server derives the user identity for protected requests from the session cookie.
Other concepts receive that opaque user identity through application reactions.
Associating owns each word. Annotating and Pitching receive the word as an opaque
context or target, and a song as an opaque item. Friending connects two users; the
application reads it to decide who is in the limited audience of a word.

An item is a whole track from the checked catalog. Annotating and Pitching never
interpret it, so when Excerpting joins the assembly, rebinding `Item` to an excerpt
identity changes this file and the code that builds the item, and no concept.

```types
concrete Track
  A reference to one track in the checked catalog, such as soundcloud:293.
```

```instances
instantiate UserAuthenticating

instantiate Associating with
  User is UserAuthenticating.User

instantiate Annotating with
  Author is UserAuthenticating.User
  Item is Track
  Context is Associating.Association

instantiate Pitching with
  Person is UserAuthenticating.User
  Target is Associating.Association
  Item is Track

instantiate Friending with
  Person is UserAuthenticating.User
```
