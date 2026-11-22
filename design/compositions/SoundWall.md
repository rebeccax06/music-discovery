# Sound Wall

The Sound Wall is one person's musical vocabulary. The session identifies the only
actor who can [add a word](reaction:SoundWall.Definitions.Associate),
[rename it or revise its description](reaction:SoundWall.Definitions.UpdateWord),
[change who can open it](reaction:SoundWall.Definitions.SetVisibility), or
[remove it](reaction:SoundWall.Definitions.RemoveWord). The browser does not choose
that actor. Requests accept words of up to 40 characters and descriptions of up to
500. The interface offers private visibility when a word is created; the
concept stores the visibility supplied by the request.

[Removing a word](reaction:SoundWall.Definitions.RemoveWord) also clears annotations
whose context is that association. Pitch cleanup belongs in this same request once
Pitching is registered. Removal and annotation cleanup run in that order in one
request. They are not yet a single database transaction.

```endpoints
SoundWall.Definitions.Associate at /wall/associate
SoundWall.Definitions.UpdateWord at /wall/update
SoundWall.Definitions.SetVisibility at /wall/visibility
SoundWall.Definitions.RemoveWord at /wall/remove
```

The [personal wall](reaction:SoundWall.Reading.ListWall) uses the
[owner's vocabulary](former:SoundWall.Reading.PersonalWall). It lists every word
that person defined, in displayed-label order, together with every annotation on
that word in annotation-identity order. A person shares their whole wall by its
username address. A visitor can [open that public wall](reaction:SoundWall.Reading.ReadPublicWall)
without an account. The [public wall](former:SoundWall.Reading.PublicWall) lists only
the owner's public words, in displayed-label order, each with only the annotations
marked shared, in annotation-identity order. Private words never appear, including
for a signed-in visitor who does not own them. An unknown username
[finds no wall](reaction:SoundWall.Reading.MissingWall).

```endpoints
SoundWall.Reading.ListWall at /wall/list
SoundWall.Reading.ReadPublicWall at /wall/public
SoundWall.Reading.MissingWall at /wall/public
```
