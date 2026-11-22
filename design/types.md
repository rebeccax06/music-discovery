# Application types

The server derives the user identity for protected requests from the session cookie.
Other concepts receive that opaque user identity through application reactions.
Associating owns each musical definition. Annotating receives the selected excerpt
as an opaque identity and the word as that association. When Excerpting joins the
assembly, bind Annotating's item directly to the excerpt identity.

```types
concrete SoundExcerpt
  The identity of an interval in a track.
```

```instances
instantiate UserAuthenticating

instantiate Associating with
  User is UserAuthenticating.User

instantiate Annotating with
  Author is UserAuthenticating.User
  Item is SoundExcerpt
  Context is Associating.Association
```
