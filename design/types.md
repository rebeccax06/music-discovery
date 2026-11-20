# Application types

The server derives the user identity for protected requests from the session cookie.
Other concepts receive that opaque user identity through application reactions.
Annotating receives the selected excerpt and the word as opaque identities. When
Excerpting and Associating join the assembly, bind the same parameters directly to
their owned identities.

```types
concrete SoundExcerpt
  The identity of an interval in a track.

concrete SoundWord
  The identity of a person's musical definition.
```

```instances
instantiate UserAuthenticating

instantiate Annotating with
  Author is UserAuthenticating.User
  Item is SoundExcerpt
  Context is SoundWord

instantiate Pitching with
  Contributor is UserAuthenticating.User
  Target is Associating.Association
  Item is SoundExcerpt
```
