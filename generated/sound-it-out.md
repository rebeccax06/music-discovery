<!-- Generated from the Sound It Out assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# Sound It Out — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Annotating

Defined in [Annotating](../design/concepts/Annotating.md), line 1.

#### Actions

- `annotate(author: Author, item: Item, context: Context, role: Role, note: String, qualities: Qualities) : returns (annotation: Annotation)`
  - Refuses `ANNOTATION_EXISTS`: This item is already included here.
- `update(author: Author, annotation: Annotation, role: Role, note: String, qualities: Qualities) : returns ()`
  - Refuses `UNKNOWN_ANNOTATION`: This annotation could not be found.
  - Refuses `NOT_AUTHOR`: You cannot edit another user's annotation.
- `setVisibility(author: Author, annotation: Annotation, visibility: Visibility) : returns ()`
  - Refuses `UNKNOWN_ANNOTATION`: This annotation could not be found.
  - Refuses `NOT_AUTHOR`: You cannot edit another user's annotation.
- `remove(author: Author, annotation: Annotation) : returns ()`
  - Refuses `UNKNOWN_ANNOTATION`: This annotation could not be found.
  - Refuses `NOT_AUTHOR`: You cannot edit another user's annotation.
- `clearContext(context: Context) : returns ()`

#### Queries

- `_get(annotation: Annotation) : optional (author: Author, item: Item, context: Context, role: Role, note: String, qualities: Qualities, visibility: Visibility)`
- `_forContext(context: Context) : many (annotation: Annotation, author: Author, item: Item, role: Role, note: String, qualities: Qualities, visibility: Visibility)`

#### Instances

- `Annotating` — instance of `Annotating` — [Application types](../design/types.md), line 24.
  - `Author` is `UserAuthenticating.User` — [Application types](../design/types.md), line 25.
  - `Context` is `Associating.Association` — [Application types](../design/types.md), line 27.
  - `Item` is `Track` — [Application types](../design/types.md), line 26.

### Associating

Defined in [Associating](../design/concepts/Associating.md), line 1.

#### Actions

- `associate(user: User, label: String, description: String, visibility: Visibility) : returns (association: Association)`
  - Refuses `INVALID_ASSOCIATION`: Provide a word.
  - Refuses `ASSOCIATION_EXISTS`: You have already defined this word.
- `update(user: User, association: Association, label: String, description: String) : returns ()`
  - Refuses `UNKNOWN_ASSOCIATION`: This word could not be found.
  - Refuses `NOT_OWNER`: You cannot edit another user's definition.
  - Refuses `INVALID_ASSOCIATION`: Provide a word.
  - Refuses `ASSOCIATION_EXISTS`: You have already defined this word.
- `setVisibility(user: User, association: Association, visibility: Visibility) : returns ()`
  - Refuses `UNKNOWN_ASSOCIATION`: This word could not be found.
  - Refuses `NOT_OWNER`: You cannot edit another user's definition.
- `remove(user: User, association: Association) : returns ()`
  - Refuses `UNKNOWN_ASSOCIATION`: This word could not be found.
  - Refuses `NOT_OWNER`: You cannot remove another user's definition.

#### Queries

- `_byUser(user: User) : many (association: Association, label: String, description: String, visibility: Visibility)`
- `_get(association: Association) : optional (user: User, label: String, description: String, visibility: Visibility)`

#### Instances

- `Associating` — instance of `Associating` — [Application types](../design/types.md), line 21.
  - `User` is `UserAuthenticating.User` — [Application types](../design/types.md), line 22.

### Friending

Defined in [Friending](../design/concepts/Friending.md), line 1.

#### Actions

- `request(sender: Person, recipient: Person) : returns ()`
  - Refuses `SELF_REQUEST`: You cannot add yourself as a friend.
  - Refuses `ALREADY_FRIENDS`: You are already friends.
  - Refuses `REQUEST_WAITING`: They have already asked to be your friend. Accept their request.
  - Refuses `REQUEST_EXISTS`: You have already asked. They have not answered yet.
- `accept(recipient: Person, sender: Person) : returns ()`
  - Refuses `NO_REQUEST`: This friend request is no longer waiting.
- `decline(recipient: Person, sender: Person) : returns ()`
  - Refuses `NO_REQUEST`: This friend request is no longer waiting.
- `cancel(sender: Person, recipient: Person) : returns ()`
  - Refuses `NO_REQUEST`: This friend request is no longer waiting.
- `unfriend(person: Person, friend: Person) : returns ()`
  - Refuses `NOT_FRIENDS`: You are not friends.

#### Queries

- `_friends(person: Person) : many (friend: Person)`
- `_friendship(person: Person, other: Person) : optional (friend: Person)`
- `_received(recipient: Person) : many (sender: Person)`
- `_sent(sender: Person) : many (recipient: Person)`

#### Instances

- `Friending` — instance of `Friending` — [Application types](../design/types.md), line 34.
  - `Person` is `UserAuthenticating.User` — [Application types](../design/types.md), line 35.

### Pitching

Defined in [Pitching](../design/concepts/Pitching.md), line 1.

#### Actions

- `pitch(contributor: Person, recipient: Person, target: Target, item: Item, note: String) : returns (pitch: Pitch)`
  - Refuses `SELF_PITCH`: You cannot suggest an item to yourself.
  - Refuses `ALREADY_PITCHED`: This item has already been suggested here.
- `withdraw(contributor: Person, pitch: Pitch) : returns ()`
  - Refuses `UNKNOWN_PITCH`: This suggestion could not be found.
  - Refuses `NOT_CONTRIBUTOR`: You cannot withdraw someone else's suggestion.
  - Refuses `ALREADY_REVIEWED`: This suggestion has already been reviewed.
- `review(recipient: Person, pitch: Pitch, fit: Fit, response: String) : returns ()`
  - Refuses `UNKNOWN_PITCH`: This suggestion could not be found.
  - Refuses `NOT_RECIPIENT`: Only the person this was suggested to can review it.
  - Refuses `INVALID_REVIEW`: Choose a fit.
- `clearTarget(target: Target) : returns ()`

#### Queries

- `_get(pitch: Pitch) : optional (contributor: Person, recipient: Person, target: Target, item: Item, note: String, fit: Fit, response: String)`
- `_forTarget(target: Target) : many (pitch: Pitch, contributor: Person, item: Item, note: String, fit: Fit, response: String)`
- `_sentBy(contributor: Person) : many (pitch: Pitch, recipient: Person, target: Target, item: Item, note: String, reviewed: Flag)`

#### Instances

- `Pitching` — instance of `Pitching` — [Application types](../design/types.md), line 29.
  - `Item` is `Track` — [Application types](../design/types.md), line 32.
  - `Person` is `UserAuthenticating.User` — [Application types](../design/types.md), line 30.
  - `Target` is `Associating.Association` — [Application types](../design/types.md), line 31.

### UserAuthenticating

Defined in [UserAuthenticating](../design/concepts/UserAuthenticating.md), line 1.

#### Actions

- `register(username: String, password: String) : returns (user: User)`
  - Refuses `INVALID_USERNAME`: Use 3 to 32 letters, numbers, underscores, or hyphens.
  - Refuses `INVALID_PASSWORD`: Use a password with 8 to 128 characters.
  - Refuses `USERNAME_TAKEN`: That username is already taken.
- `authenticate(username: String, password: String) : returns (user: User, username: String, session: Session, expiresAt: DateTime)`
  - Refuses `INVALID_CREDENTIALS`: The username or password is incorrect.
- `current(session: Session) : returns (user: User, username: String)`
  - Refuses `UNKNOWN_SESSION`: Sign in to continue.
- `logout(session: Session) : returns ()`
  - Refuses `UNKNOWN_SESSION`: Sign in to continue.

#### Queries

- `_byUsername(username: String) : optional (user: User, name: String)`
- `_username(user: User) : optional (username: String)`

#### Instances

- `UserAuthenticating` — instance of `UserAuthenticating` — [Application types](../design/types.md), line 19.

## Application types

Concrete types:

- `Track` — [Application types](../design/types.md), line 14.

## Views

_Views name reusable conditions. Multiple `where` blocks are alternatives._

### (association) is a friends' word that (viewer) may open

Authored path: `Suggestions.Sending.friendsWord`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 15.

```view
(association) is a friends' word that (viewer) may open — inputs (association, viewer); outputs (); bindings (owner)
  where
    Associating._get (association) has (user: owner, visibility: "LIMITED")
    Friending._friendship (other: owner, person: viewer)
```

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the sound wall of (user) open to (levels)

Authored path: `SoundWall.Reading.VisibleWall`.
- Covered by [Friends](../design/compositions/Friends.md), line 16.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 87.

```former
Former "the sound wall of (user) open to (levels)" — inputs (user, levels); bindings (association, label, description, visibility, annotation, item, role, note, qualities); promises exactly one record — forms:
  a record of
    words: each Associating._byUser (user) has (association, description, label, visibility)
      where visibility is among levels
      arranged by label
      form a record of
        association
        description
        examples: each Annotating._forContext (context: association) has (annotation, item, note, qualities, role, visibility: "SHARED")
          arranged by annotation
          form a record of
            annotation
            item
            note
            qualities
            role
        label
        visibility
```

### the friends and requests of (user)

Authored path: `Friends.Circle.Circle`.
- Covered by [Friends](../design/compositions/Friends.md), line 14.

```former
Former "the friends and requests of (user)" — inputs (user); bindings (friend, friendName, sender, senderName, recipient, recipientName); promises exactly one record — forms:
  a record of
    friends: each Friending._friends (person: user) has (friend)
      where UserAuthenticating._username (user: friend) has (username: friendName)
      arranged by friendName
      form a record of
        username: friendName
        wall: former "the sound wall of (user) open to (levels)" with (levels: ["LIMITED", "PUBLIC"], user: friend)
    received: each Friending._received (recipient: user) has (sender)
      where UserAuthenticating._username (user: sender) has (username: senderName)
      arranged by senderName
      form a record of
        username: senderName
    sent: each Friending._sent (sender: user) has (recipient)
      where UserAuthenticating._username (user: recipient) has (username: recipientName)
      arranged by recipientName
      form a record of
        username: recipientName
```

### the personal sound wall (user)

Authored path: `SoundWall.Reading.PersonalWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 80.

```former
Former "the personal sound wall (user)" — inputs (user); bindings (association, label, description, visibility, annotation, item, role, note, qualities, exampleVisibility, pitch, contributor, contributorName, pitchedItem, pitchNote, fit, response); promises exactly one record — forms:
  a record of
    words: each Associating._byUser (user) has (association, description, label, visibility)
      arranged by label
      form a record of
        association
        description
        examples: each Annotating._forContext (context: association) has (annotation, item, note, qualities, role, visibility: exampleVisibility)
          arranged by annotation
          form a record of
            annotation
            item
            note
            qualities
            role
            visibility: exampleVisibility
        label
        suggestions: each Pitching._forTarget (target: association) has (contributor, fit, item: pitchedItem, note: pitchNote, pitch, response)
          where UserAuthenticating._username (user: contributor) has (username: contributorName)
          arranged by pitch
          form a record of
            contributor: contributorName
            fit
            item: pitchedItem
            note: pitchNote
            pitch
            response
        visibility
```

### the suggestions (user) has sent

Authored path: `Suggestions.Sending.SuggestionsSent`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 24.

```former
Former "the suggestions (user) has sent" — inputs (user); bindings (pitch, recipient, to, target, item, note, reviewed); promises exactly one record — forms:
  each Pitching._sentBy (contributor: user) has (item, note, pitch, recipient, reviewed, target)
    where UserAuthenticating._username (user: recipient) has (username: to)
    arranged by pitch
    form a record of
      item
      note
      pitch
      reviewed
      to
      word: target
```

### the word (association) after a write

Authored path: `SoundWall.Examples.WordAfterWrite`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 52.

```former
Former "the word (association) after a write" — inputs (association); bindings (label); promises exactly one record — forms:
  a record of
    where whether Associating._get (association) has (label)
    label
```

## Reactions

### Accounts.Login

Authored path: `Accounts.Login`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 7.
- Covered by [Accounts](../design/compositions/Accounts.md), line 18.

```reaction
when RequestBoundary.request (password, path: "/auth/login", requestId, username)
then
  UserAuthenticating.authenticate (password, username)
```

### Accounts.Login#2

Authored path: `Accounts.Login`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 7.
- Covered by [Accounts](../design/compositions/Accounts.md), line 18.

```reaction
when UserAuthenticating.authenticate (password, username, expiresAt, session, user, result.username: displayName), asked by Accounts.Login
where
  earlier, RequestBoundary.request (password, path: "/auth/login", requestId, username)
then
  RequestBoundary.respond (expiresAt, requestId, session, user, username: displayName)
```

### Accounts.Logout

Authored path: `Accounts.Logout`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 10.
- Covered by [Accounts](../design/compositions/Accounts.md), line 20.

```reaction
when RequestBoundary.request (path: "/auth/logout", requestId, session)
then
  UserAuthenticating.logout (session)
```

### Accounts.Logout#2

Authored path: `Accounts.Logout`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 10.
- Covered by [Accounts](../design/compositions/Accounts.md), line 20.

```reaction
when UserAuthenticating.logout (session), asked by Accounts.Logout
where
  earlier, RequestBoundary.request (path: "/auth/logout", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### Accounts.Me

Authored path: `Accounts.Me`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 9.
- Covered by [Accounts](../design/compositions/Accounts.md), line 19.

```reaction
when RequestBoundary.request (path: "/auth/me", requestId, session)
then
  UserAuthenticating.current (session)
```

### Accounts.Me#2

Authored path: `Accounts.Me`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 9.
- Covered by [Accounts](../design/compositions/Accounts.md), line 19.

```reaction
when UserAuthenticating.current (session, user, username), asked by Accounts.Me
where
  earlier, RequestBoundary.request (path: "/auth/me", requestId, session)
then
  RequestBoundary.respond (requestId, user, username)
```

### Accounts.Register

Authored path: `Accounts.Register`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 7.
- Covered by [Accounts](../design/compositions/Accounts.md), line 17.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  UserAuthenticating.register (password, username)
```

### Accounts.Register#2

Authored path: `Accounts.Register`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 7.
- Covered by [Accounts](../design/compositions/Accounts.md), line 17.

```reaction
when UserAuthenticating.register (password, username, user), asked by Accounts.Register
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  RequestBoundary.respond (requestId, user)
```

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### Friends.Circle.List

Authored path: `Friends.Circle.List`.
- Covered by [Friends](../design/compositions/Friends.md), line 13.
- Covered by [Friends](../design/compositions/Friends.md), line 21.

```reaction
when RequestBoundary.request (path: "/friends/list", requestId, session)
then
  UserAuthenticating.current (session)
```

### Friends.Circle.List#2

Authored path: `Friends.Circle.List`.
- Covered by [Friends](../design/compositions/Friends.md), line 13.
- Covered by [Friends](../design/compositions/Friends.md), line 21.

```reaction
when UserAuthenticating.current (session, user), asked by Friends.Circle.List
where
  earlier, RequestBoundary.request (path: "/friends/list", requestId, session)
then
  RequestBoundary.respond (circle: former "the friends and requests of (user)" with (user), requestId)
```

### Friends.Leaving.Remove

Authored path: `Friends.Leaving.Remove`.
- Covered by [Friends](../design/compositions/Friends.md), line 45.
- Covered by [Friends](../design/compositions/Friends.md), line 52.

```reaction
when RequestBoundary.request (path: "/friends/remove", requestId, session, username)
then
  UserAuthenticating.current (session)
```

### Friends.Leaving.Remove:known#2

Authored path: `Friends.Leaving.Remove`.
- Covered by [Friends](../design/compositions/Friends.md), line 45.
- Covered by [Friends](../design/compositions/Friends.md), line 52.

```reaction
when UserAuthenticating.current (session, user), asked by Friends.Leaving.Remove
where
  earlier, RequestBoundary.request (path: "/friends/remove", requestId, session, username)
  UserAuthenticating._byUsername (username) has (user: other)
then
  Friending.unfriend (friend: other, person: user)
```

### Friends.Leaving.Remove:known#3

Authored path: `Friends.Leaving.Remove`.
- Covered by [Friends](../design/compositions/Friends.md), line 45.
- Covered by [Friends](../design/compositions/Friends.md), line 52.

```reaction
when Friending.unfriend (friend: other, person: user), asked by Friends.Leaving.Remove:known#2
where
  earlier, RequestBoundary.request (path: "/friends/remove", requestId, session, username)
then
  RequestBoundary.respond (requestId)
```

### Friends.Leaving.Remove:unknown#2

Authored path: `Friends.Leaving.Remove`.
- Covered by [Friends](../design/compositions/Friends.md), line 45.
- Covered by [Friends](../design/compositions/Friends.md), line 52.

```reaction
when UserAuthenticating.current (session, user), asked by Friends.Leaving.Remove
where
  earlier, RequestBoundary.request (path: "/friends/remove", requestId, session, username)
  no UserAuthenticating._byUsername (username)
then
  RequestBoundary.respond (error: "PERSON_NOT_FOUND", requestId)
```

### Friends.Requests.Accept

Authored path: `Friends.Requests.Accept`.
- Covered by [Friends](../design/compositions/Friends.md), line 29.
- Covered by [Friends](../design/compositions/Friends.md), line 38.

```reaction
when RequestBoundary.request (path: "/friends/accept", requestId, session, username)
then
  UserAuthenticating.current (session)
```

### Friends.Requests.Accept:known#2

Authored path: `Friends.Requests.Accept`.
- Covered by [Friends](../design/compositions/Friends.md), line 29.
- Covered by [Friends](../design/compositions/Friends.md), line 38.

```reaction
when UserAuthenticating.current (session, user), asked by Friends.Requests.Accept
where
  earlier, RequestBoundary.request (path: "/friends/accept", requestId, session, username)
  UserAuthenticating._byUsername (username) has (user: other)
then
  Friending.accept (recipient: user, sender: other)
```

### Friends.Requests.Accept:known#3

Authored path: `Friends.Requests.Accept`.
- Covered by [Friends](../design/compositions/Friends.md), line 29.
- Covered by [Friends](../design/compositions/Friends.md), line 38.

```reaction
when Friending.accept (recipient: user, sender: other), asked by Friends.Requests.Accept:known#2
where
  earlier, RequestBoundary.request (path: "/friends/accept", requestId, session, username)
then
  RequestBoundary.respond (requestId)
```

### Friends.Requests.Accept:unknown#2

Authored path: `Friends.Requests.Accept`.
- Covered by [Friends](../design/compositions/Friends.md), line 29.
- Covered by [Friends](../design/compositions/Friends.md), line 38.

```reaction
when UserAuthenticating.current (session, user), asked by Friends.Requests.Accept
where
  earlier, RequestBoundary.request (path: "/friends/accept", requestId, session, username)
  no UserAuthenticating._byUsername (username)
then
  RequestBoundary.respond (error: "PERSON_NOT_FOUND", requestId)
```

### Friends.Requests.Cancel

Authored path: `Friends.Requests.Cancel`.
- Covered by [Friends](../design/compositions/Friends.md), line 31.
- Covered by [Friends](../design/compositions/Friends.md), line 40.

```reaction
when RequestBoundary.request (path: "/friends/cancel", requestId, session, username)
then
  UserAuthenticating.current (session)
```

### Friends.Requests.Cancel:known#2

Authored path: `Friends.Requests.Cancel`.
- Covered by [Friends](../design/compositions/Friends.md), line 31.
- Covered by [Friends](../design/compositions/Friends.md), line 40.

```reaction
when UserAuthenticating.current (session, user), asked by Friends.Requests.Cancel
where
  earlier, RequestBoundary.request (path: "/friends/cancel", requestId, session, username)
  UserAuthenticating._byUsername (username) has (user: other)
then
  Friending.cancel (recipient: other, sender: user)
```

### Friends.Requests.Cancel:known#3

Authored path: `Friends.Requests.Cancel`.
- Covered by [Friends](../design/compositions/Friends.md), line 31.
- Covered by [Friends](../design/compositions/Friends.md), line 40.

```reaction
when Friending.cancel (recipient: other, sender: user), asked by Friends.Requests.Cancel:known#2
where
  earlier, RequestBoundary.request (path: "/friends/cancel", requestId, session, username)
then
  RequestBoundary.respond (requestId)
```

### Friends.Requests.Cancel:unknown#2

Authored path: `Friends.Requests.Cancel`.
- Covered by [Friends](../design/compositions/Friends.md), line 31.
- Covered by [Friends](../design/compositions/Friends.md), line 40.

```reaction
when UserAuthenticating.current (session, user), asked by Friends.Requests.Cancel
where
  earlier, RequestBoundary.request (path: "/friends/cancel", requestId, session, username)
  no UserAuthenticating._byUsername (username)
then
  RequestBoundary.respond (error: "PERSON_NOT_FOUND", requestId)
```

### Friends.Requests.Decline

Authored path: `Friends.Requests.Decline`.
- Covered by [Friends](../design/compositions/Friends.md), line 30.
- Covered by [Friends](../design/compositions/Friends.md), line 39.

```reaction
when RequestBoundary.request (path: "/friends/decline", requestId, session, username)
then
  UserAuthenticating.current (session)
```

### Friends.Requests.Decline:known#2

Authored path: `Friends.Requests.Decline`.
- Covered by [Friends](../design/compositions/Friends.md), line 30.
- Covered by [Friends](../design/compositions/Friends.md), line 39.

```reaction
when UserAuthenticating.current (session, user), asked by Friends.Requests.Decline
where
  earlier, RequestBoundary.request (path: "/friends/decline", requestId, session, username)
  UserAuthenticating._byUsername (username) has (user: other)
then
  Friending.decline (recipient: user, sender: other)
```

### Friends.Requests.Decline:known#3

Authored path: `Friends.Requests.Decline`.
- Covered by [Friends](../design/compositions/Friends.md), line 30.
- Covered by [Friends](../design/compositions/Friends.md), line 39.

```reaction
when Friending.decline (recipient: user, sender: other), asked by Friends.Requests.Decline:known#2
where
  earlier, RequestBoundary.request (path: "/friends/decline", requestId, session, username)
then
  RequestBoundary.respond (requestId)
```

### Friends.Requests.Decline:unknown#2

Authored path: `Friends.Requests.Decline`.
- Covered by [Friends](../design/compositions/Friends.md), line 30.
- Covered by [Friends](../design/compositions/Friends.md), line 39.

```reaction
when UserAuthenticating.current (session, user), asked by Friends.Requests.Decline
where
  earlier, RequestBoundary.request (path: "/friends/decline", requestId, session, username)
  no UserAuthenticating._byUsername (username)
then
  RequestBoundary.respond (error: "PERSON_NOT_FOUND", requestId)
```

### Friends.Requests.Request

Authored path: `Friends.Requests.Request`.
- Covered by [Friends](../design/compositions/Friends.md), line 26.
- Covered by [Friends](../design/compositions/Friends.md), line 37.

```reaction
when RequestBoundary.request (path: "/friends/request", requestId, session, username)
then
  UserAuthenticating.current (session)
```

### Friends.Requests.Request:known#2

Authored path: `Friends.Requests.Request`.
- Covered by [Friends](../design/compositions/Friends.md), line 26.
- Covered by [Friends](../design/compositions/Friends.md), line 37.

```reaction
when UserAuthenticating.current (session, user), asked by Friends.Requests.Request
where
  earlier, RequestBoundary.request (path: "/friends/request", requestId, session, username)
  UserAuthenticating._byUsername (username) has (user: other)
then
  Friending.request (recipient: other, sender: user)
```

### Friends.Requests.Request:known#3

Authored path: `Friends.Requests.Request`.
- Covered by [Friends](../design/compositions/Friends.md), line 26.
- Covered by [Friends](../design/compositions/Friends.md), line 37.

```reaction
when Friending.request (recipient: other, sender: user), asked by Friends.Requests.Request:known#2
where
  earlier, RequestBoundary.request (path: "/friends/request", requestId, session, username)
then
  RequestBoundary.respond (requestId)
```

### Friends.Requests.Request:unknown#2

Authored path: `Friends.Requests.Request`.
- Covered by [Friends](../design/compositions/Friends.md), line 26.
- Covered by [Friends](../design/compositions/Friends.md), line 37.

```reaction
when UserAuthenticating.current (session, user), asked by Friends.Requests.Request
where
  earlier, RequestBoundary.request (path: "/friends/request", requestId, session, username)
  no UserAuthenticating._byUsername (username)
then
  RequestBoundary.respond (error: "PERSON_NOT_FOUND", requestId)
```

### SoundWall.Definitions.Associate

Authored path: `SoundWall.Definitions.Associate`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 4.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 21.

```reaction
when RequestBoundary.request (description, label, path: "/wall/associate", requestId, session, visibility)
then
  UserAuthenticating.current (session)
```

### SoundWall.Definitions.Associate#2

Authored path: `SoundWall.Definitions.Associate`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 4.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 21.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Definitions.Associate
where
  earlier, RequestBoundary.request (description, label, path: "/wall/associate", requestId, session, visibility)
then
  Associating.associate (description, label, user, visibility)
```

### SoundWall.Definitions.Associate#3

Authored path: `SoundWall.Definitions.Associate`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 4.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 21.

```reaction
when Associating.associate (description, label, user, visibility, association), asked by SoundWall.Definitions.Associate#2
where
  earlier, RequestBoundary.request (description, label, path: "/wall/associate", requestId, session, visibility)
then
  RequestBoundary.respond (association, requestId)
```

### SoundWall.Definitions.RemoveWord

Authored path: `SoundWall.Definitions.RemoveWord`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 7.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 15.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 24.

```reaction
when RequestBoundary.request (association, path: "/wall/remove", requestId, session)
then
  UserAuthenticating.current (session)
```

### SoundWall.Definitions.RemoveWord#2

Authored path: `SoundWall.Definitions.RemoveWord`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 7.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 15.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 24.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Definitions.RemoveWord
where
  earlier, RequestBoundary.request (association, path: "/wall/remove", requestId, session)
then
  Associating.remove (association, user)
```

### SoundWall.Definitions.RemoveWord#3

Authored path: `SoundWall.Definitions.RemoveWord`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 7.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 15.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 24.

```reaction
when Associating.remove (association, user), asked by SoundWall.Definitions.RemoveWord#2
then
  Annotating.clearContext (context: association)
```

### SoundWall.Definitions.RemoveWord#4

Authored path: `SoundWall.Definitions.RemoveWord`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 7.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 15.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 24.

```reaction
when Annotating.clearContext (context: association), asked by SoundWall.Definitions.RemoveWord#3
then
  Pitching.clearTarget (target: association)
```

### SoundWall.Definitions.RemoveWord#5

Authored path: `SoundWall.Definitions.RemoveWord`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 7.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 15.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 24.

```reaction
when Pitching.clearTarget (target: association), asked by SoundWall.Definitions.RemoveWord#4
where
  earlier, RequestBoundary.request (association, path: "/wall/remove", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### SoundWall.Definitions.SetVisibility

Authored path: `SoundWall.Definitions.SetVisibility`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 6.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 23.

```reaction
when RequestBoundary.request (association, path: "/wall/visibility", requestId, session, visibility)
then
  UserAuthenticating.current (session)
```

### SoundWall.Definitions.SetVisibility#2

Authored path: `SoundWall.Definitions.SetVisibility`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 6.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 23.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Definitions.SetVisibility
where
  earlier, RequestBoundary.request (association, path: "/wall/visibility", requestId, session, visibility)
then
  Associating.setVisibility (association, user, visibility)
```

### SoundWall.Definitions.SetVisibility#3

Authored path: `SoundWall.Definitions.SetVisibility`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 6.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 23.

```reaction
when Associating.setVisibility (association, user, visibility), asked by SoundWall.Definitions.SetVisibility#2
where
  earlier, RequestBoundary.request (association, path: "/wall/visibility", requestId, session, visibility)
then
  RequestBoundary.respond (requestId)
```

### SoundWall.Definitions.UpdateWord

Authored path: `SoundWall.Definitions.UpdateWord`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 5.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 22.

```reaction
when RequestBoundary.request (association, description, label, path: "/wall/update", requestId, session)
then
  UserAuthenticating.current (session)
```

### SoundWall.Definitions.UpdateWord#2

Authored path: `SoundWall.Definitions.UpdateWord`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 5.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 22.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Definitions.UpdateWord
where
  earlier, RequestBoundary.request (association, description, label, path: "/wall/update", requestId, session)
then
  Associating.update (association, description, label, user)
```

### SoundWall.Definitions.UpdateWord#3

Authored path: `SoundWall.Definitions.UpdateWord`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 5.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 22.

```reaction
when Associating.update (association, description, label, user), asked by SoundWall.Definitions.UpdateWord#2
where
  earlier, RequestBoundary.request (association, description, label, path: "/wall/update", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### SoundWall.Examples.AddExample

Authored path: `SoundWall.Examples.AddExample`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 29.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 45.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 51.

```reaction
when RequestBoundary.request (association, item, note, path: "/wall/examples/add", qualities, requestId, role, session)
then
  UserAuthenticating.current (session)
```

### SoundWall.Examples.AddExample:not-own-word#2

Authored path: `SoundWall.Examples.AddExample`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 29.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 45.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 51.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Examples.AddExample
where
  earlier, RequestBoundary.request (association, item, note, path: "/wall/examples/add", qualities, requestId, role, session)
  no Associating._get (association) has (user)
then
  RequestBoundary.respond (error: "WORD_NOT_FOUND", requestId)
```

### SoundWall.Examples.AddExample:own-word#2

Authored path: `SoundWall.Examples.AddExample`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 29.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 45.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 51.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Examples.AddExample
where
  earlier, RequestBoundary.request (association, item, note, path: "/wall/examples/add", qualities, requestId, role, session)
  Associating._get (association) has (user)
then
  Annotating.annotate (author: user, context: association, item, note, qualities, role)
```

### SoundWall.Examples.AddExample:own-word#3

Authored path: `SoundWall.Examples.AddExample`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 29.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 45.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 51.

```reaction
when Annotating.annotate (author: user, context: association, item, note, qualities, role, annotation), asked by SoundWall.Examples.AddExample:own-word#2
where
  earlier, RequestBoundary.request (association, item, note, path: "/wall/examples/add", qualities, requestId, role, session)
then
  RequestBoundary.respond (annotation, requestId, word: former "the word (association) after a write" with (association))
```

### SoundWall.Examples.ClearExamplesOfMissingWord

Authored path: `SoundWall.Examples.ClearExamplesOfMissingWord`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 66.

```reaction
when Annotating.annotate (context)
where
  no Associating._get (association: context)
then
  Annotating.clearContext (context)
```

### SoundWall.Examples.RemoveExample

Authored path: `SoundWall.Examples.RemoveExample`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 39.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 48.

```reaction
when RequestBoundary.request (annotation, path: "/wall/examples/remove", requestId, session)
then
  UserAuthenticating.current (session)
```

### SoundWall.Examples.RemoveExample#2

Authored path: `SoundWall.Examples.RemoveExample`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 39.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 48.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Examples.RemoveExample
where
  earlier, RequestBoundary.request (annotation, path: "/wall/examples/remove", requestId, session)
then
  Annotating.remove (annotation, author: user)
```

### SoundWall.Examples.RemoveExample#3

Authored path: `SoundWall.Examples.RemoveExample`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 39.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 48.

```reaction
when Annotating.remove (annotation, author: user), asked by SoundWall.Examples.RemoveExample#2
where
  earlier, RequestBoundary.request (annotation, path: "/wall/examples/remove", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### SoundWall.Examples.SetExampleVisibility

Authored path: `SoundWall.Examples.SetExampleVisibility`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 38.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 47.

```reaction
when RequestBoundary.request (annotation, path: "/wall/examples/visibility", requestId, session, visibility)
then
  UserAuthenticating.current (session)
```

### SoundWall.Examples.SetExampleVisibility#2

Authored path: `SoundWall.Examples.SetExampleVisibility`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 38.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 47.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Examples.SetExampleVisibility
where
  earlier, RequestBoundary.request (annotation, path: "/wall/examples/visibility", requestId, session, visibility)
then
  Annotating.setVisibility (annotation, author: user, visibility)
```

### SoundWall.Examples.SetExampleVisibility#3

Authored path: `SoundWall.Examples.SetExampleVisibility`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 38.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 47.

```reaction
when Annotating.setVisibility (annotation, author: user, visibility), asked by SoundWall.Examples.SetExampleVisibility#2
where
  earlier, RequestBoundary.request (annotation, path: "/wall/examples/visibility", requestId, session, visibility)
then
  RequestBoundary.respond (requestId)
```

### SoundWall.Examples.UpdateExample

Authored path: `SoundWall.Examples.UpdateExample`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 37.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 46.

```reaction
when RequestBoundary.request (annotation, note, path: "/wall/examples/update", qualities, requestId, role, session)
then
  UserAuthenticating.current (session)
```

### SoundWall.Examples.UpdateExample#2

Authored path: `SoundWall.Examples.UpdateExample`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 37.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 46.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Examples.UpdateExample
where
  earlier, RequestBoundary.request (annotation, note, path: "/wall/examples/update", qualities, requestId, role, session)
then
  Annotating.update (annotation, author: user, note, qualities, role)
```

### SoundWall.Examples.UpdateExample#3

Authored path: `SoundWall.Examples.UpdateExample`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 37.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 46.

```reaction
when Annotating.update (annotation, author: user, note, qualities, role), asked by SoundWall.Examples.UpdateExample#2
where
  earlier, RequestBoundary.request (annotation, note, path: "/wall/examples/update", qualities, requestId, role, session)
then
  RequestBoundary.respond (requestId)
```

### SoundWall.Reading.ListWall

Authored path: `SoundWall.Reading.ListWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 79.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 108.

```reaction
when RequestBoundary.request (path: "/wall/list", requestId, session)
then
  UserAuthenticating.current (session)
```

### SoundWall.Reading.ListWall#2

Authored path: `SoundWall.Reading.ListWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 79.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 108.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Reading.ListWall
where
  earlier, RequestBoundary.request (path: "/wall/list", requestId, session)
then
  RequestBoundary.respond (requestId, wall: former "the personal sound wall (user)" with (user))
```

### SoundWall.Reading.MissingWall

Authored path: `SoundWall.Reading.MissingWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 98.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 110.

```reaction
when RequestBoundary.request (path: "/wall/public", requestId, username)
where
  no UserAuthenticating._byUsername (username)
then
  RequestBoundary.respond (error: "WALL_NOT_FOUND", requestId)
```

### SoundWall.Reading.PreviewWall

Authored path: `SoundWall.Reading.PreviewWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 103.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 112.

```reaction
when RequestBoundary.request (path: "/wall/preview", requestId, session)
then
  UserAuthenticating.current (session)
```

### SoundWall.Reading.PreviewWall#2

Authored path: `SoundWall.Reading.PreviewWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 103.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 112.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Reading.PreviewWall
where
  earlier, RequestBoundary.request (path: "/wall/preview", requestId, session)
then
  RequestBoundary.respond (anyone: former "the sound wall of (user) open to (levels)" with (levels: ["PUBLIC"], user), friends: former "the sound wall of (user) open to (levels)" with (levels: ["LIMITED", "PUBLIC"], user), requestId)
```

### SoundWall.Reading.ReadPublicWall

Authored path: `SoundWall.Reading.ReadPublicWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 95.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 109.

```reaction
when RequestBoundary.request (path: "/wall/public", requestId, username)
where
  UserAuthenticating._byUsername (username) has (name, user)
then
  RequestBoundary.respond (owner: name, requestId, wall: former "the sound wall of (user) open to (levels)" with (levels: ["PUBLIC"], user))
```

### SoundWall.Reading.VisitWall

Authored path: `SoundWall.Reading.VisitWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 99.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 111.

```reaction
when RequestBoundary.request (path: "/wall/visit", requestId, session, username)
then
  UserAuthenticating.current (session)
```

### SoundWall.Reading.VisitWall:friend#2

Authored path: `SoundWall.Reading.VisitWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 99.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 111.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Reading.VisitWall
where
  earlier, RequestBoundary.request (path: "/wall/visit", requestId, session, username)
  UserAuthenticating._byUsername (username) has (name, user: owner)
  Friending._friendship (other: owner, person: user)
then
  RequestBoundary.respond (owner: name, requestId, wall: former "the sound wall of (user) open to (levels)" with (levels: ["LIMITED", "PUBLIC"], user: owner))
```

### SoundWall.Reading.VisitWall:no-wall#2

Authored path: `SoundWall.Reading.VisitWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 99.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 111.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Reading.VisitWall
where
  earlier, RequestBoundary.request (path: "/wall/visit", requestId, session, username)
  no UserAuthenticating._byUsername (username)
then
  RequestBoundary.respond (error: "WALL_NOT_FOUND", requestId)
```

### SoundWall.Reading.VisitWall:not-friend#2

Authored path: `SoundWall.Reading.VisitWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 99.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 111.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Reading.VisitWall
where
  earlier, RequestBoundary.request (path: "/wall/visit", requestId, session, username)
  UserAuthenticating._byUsername (username) has (name, user: owner)
  no Friending._friendship (other: owner, person: user)
then
  RequestBoundary.respond (owner: name, requestId, wall: former "the sound wall of (user) open to (levels)" with (levels: ["PUBLIC"], user: owner))
```

### Suggestions.Reviewing.Promote

Authored path: `Suggestions.Reviewing.Promote`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 65.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 75.

```reaction
when RequestBoundary.request (note, path: "/suggestions/promote", pitch, qualities, requestId, session)
then
  UserAuthenticating.current (session)
```

### Suggestions.Reviewing.Promote:not-own-match#2

Authored path: `Suggestions.Reviewing.Promote`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 65.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 75.

```reaction
when UserAuthenticating.current (session, user), asked by Suggestions.Reviewing.Promote
where
  earlier, RequestBoundary.request (note, path: "/suggestions/promote", pitch, qualities, requestId, session)
  no Pitching._get (pitch) has (fit: "MATCH", recipient: user)
then
  RequestBoundary.respond (error: "NOT_A_MATCH", requestId)
```

### Suggestions.Reviewing.Promote:own-match#2

Authored path: `Suggestions.Reviewing.Promote`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 65.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 75.

```reaction
when UserAuthenticating.current (session, user), asked by Suggestions.Reviewing.Promote
where
  earlier, RequestBoundary.request (note, path: "/suggestions/promote", pitch, qualities, requestId, session)
  Pitching._get (pitch) has (fit: "MATCH", item, recipient: user, target)
then
  Annotating.annotate (author: user, context: target, item, note, qualities, role: "EXAMPLE")
```

### Suggestions.Reviewing.Promote:own-match#3

Authored path: `Suggestions.Reviewing.Promote`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 65.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 75.

```reaction
when Annotating.annotate (author: user, context: target, item, note, qualities, role: "EXAMPLE", annotation), asked by Suggestions.Reviewing.Promote:own-match#2
where
  earlier, RequestBoundary.request (note, path: "/suggestions/promote", pitch, qualities, requestId, session)
then
  RequestBoundary.respond (annotation, requestId, word: former "the word (association) after a write" with (association: target))
```

### Suggestions.Reviewing.Review

Authored path: `Suggestions.Reviewing.Review`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 59.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 74.

```reaction
when RequestBoundary.request (fit, path: "/suggestions/review", pitch, requestId, response, session)
then
  UserAuthenticating.current (session)
```

### Suggestions.Reviewing.Review#2

Authored path: `Suggestions.Reviewing.Review`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 59.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 74.

```reaction
when UserAuthenticating.current (session, user), asked by Suggestions.Reviewing.Review
where
  earlier, RequestBoundary.request (fit, path: "/suggestions/review", pitch, requestId, response, session)
then
  Pitching.review (fit, pitch, recipient: user, response)
```

### Suggestions.Reviewing.Review#3

Authored path: `Suggestions.Reviewing.Review`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 59.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 74.

```reaction
when Pitching.review (fit, pitch, recipient: user, response), asked by Suggestions.Reviewing.Review#2
where
  earlier, RequestBoundary.request (fit, path: "/suggestions/review", pitch, requestId, response, session)
then
  RequestBoundary.respond (requestId)
```

### Suggestions.Sending.ClearSuggestionsOfMissingWord

Authored path: `Suggestions.Sending.ClearSuggestionsOfMissingWord`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 49.

```reaction
when Pitching.pitch (target)
where
  no Associating._get (association: target)
then
  Pitching.clearTarget (target)
```

### Suggestions.Sending.ListSent

Authored path: `Suggestions.Sending.ListSent`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 23.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 34.

```reaction
when RequestBoundary.request (path: "/suggestions/sent", requestId, session)
then
  UserAuthenticating.current (session)
```

### Suggestions.Sending.ListSent#2

Authored path: `Suggestions.Sending.ListSent`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 23.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 34.

```reaction
when UserAuthenticating.current (session, user), asked by Suggestions.Sending.ListSent
where
  earlier, RequestBoundary.request (path: "/suggestions/sent", requestId, session)
then
  RequestBoundary.respond (requestId, suggestions: former "the suggestions (user) has sent" with (user))
```

### Suggestions.Sending.Send

Authored path: `Suggestions.Sending.Send`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 10.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 33.

```reaction
when RequestBoundary.request (association, item, note, path: "/suggestions/send", requestId, session)
then
  UserAuthenticating.current (session)
```

### Suggestions.Sending.Send:friends-word#2

Authored path: `Suggestions.Sending.Send`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 10.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 33.

```reaction
when UserAuthenticating.current (session, user), asked by Suggestions.Sending.Send
where
  earlier, RequestBoundary.request (association, item, note, path: "/suggestions/send", requestId, session)
  Associating._get (association) has (user: owner, visibility: "LIMITED")
  Friending._friendship (other: owner, person: user)
then
  Pitching.pitch (contributor: user, item, note, recipient: owner, target: association)
```

### Suggestions.Sending.Send:friends-word#3

Authored path: `Suggestions.Sending.Send`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 10.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 33.

```reaction
when Pitching.pitch (contributor: user, item, note, recipient: owner, target: association, pitch), asked by Suggestions.Sending.Send:friends-word#2
where
  earlier, RequestBoundary.request (association, item, note, path: "/suggestions/send", requestId, session)
then
  RequestBoundary.respond (pitch, requestId, word: former "the word (association) after a write" with (association))
```

### Suggestions.Sending.Send:no-open-word#2

Authored path: `Suggestions.Sending.Send`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 10.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 33.

```reaction
when UserAuthenticating.current (session, user), asked by Suggestions.Sending.Send
where
  earlier, RequestBoundary.request (association, item, note, path: "/suggestions/send", requestId, session)
  no Associating._get (association) has (visibility: "PUBLIC")
  no view "(association) is a friends' word that (viewer) may open" with (association, viewer: user)
then
  RequestBoundary.respond (error: "WORD_NOT_FOUND", requestId)
```

### Suggestions.Sending.Send:public-word#2

Authored path: `Suggestions.Sending.Send`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 10.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 33.

```reaction
when UserAuthenticating.current (session, user), asked by Suggestions.Sending.Send
where
  earlier, RequestBoundary.request (association, item, note, path: "/suggestions/send", requestId, session)
  Associating._get (association) has (user: owner, visibility: "PUBLIC")
then
  Pitching.pitch (contributor: user, item, note, recipient: owner, target: association)
```

### Suggestions.Sending.Send:public-word#3

Authored path: `Suggestions.Sending.Send`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 10.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 33.

```reaction
when Pitching.pitch (contributor: user, item, note, recipient: owner, target: association, pitch), asked by Suggestions.Sending.Send:public-word#2
where
  earlier, RequestBoundary.request (association, item, note, path: "/suggestions/send", requestId, session)
then
  RequestBoundary.respond (pitch, requestId, word: former "the word (association) after a write" with (association))
```

### Suggestions.Sending.Withdraw

Authored path: `Suggestions.Sending.Withdraw`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 28.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 35.

```reaction
when RequestBoundary.request (path: "/suggestions/withdraw", pitch, requestId, session)
then
  UserAuthenticating.current (session)
```

### Suggestions.Sending.Withdraw#2

Authored path: `Suggestions.Sending.Withdraw`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 28.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 35.

```reaction
when UserAuthenticating.current (session, user), asked by Suggestions.Sending.Withdraw
where
  earlier, RequestBoundary.request (path: "/suggestions/withdraw", pitch, requestId, session)
then
  Pitching.withdraw (contributor: user, pitch)
```

### Suggestions.Sending.Withdraw#3

Authored path: `Suggestions.Sending.Withdraw`.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 28.
- Covered by [Suggestions](../design/compositions/Suggestions.md), line 35.

```reaction
when Pitching.withdraw (contributor: user, pitch), asked by Suggestions.Sending.Withdraw#2
where
  earlier, RequestBoundary.request (path: "/suggestions/withdraw", pitch, requestId, session)
then
  RequestBoundary.respond (requestId)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/auth/login` — requires `username`, `password`
- `/auth/logout` — requires `session`
- `/auth/me` — requires `session`
- `/auth/register` — requires `username`, `password`
- `/friends/accept` — requires `session`, `username`
- `/friends/cancel` — requires `session`, `username`
- `/friends/decline` — requires `session`, `username`
- `/friends/list` — requires `session`
- `/friends/remove` — requires `session`, `username`
- `/friends/request` — requires `session`, `username`
- `/suggestions/promote` — requires `session`, `pitch`, `note`, `qualities`
- `/suggestions/review` — requires `session`, `pitch`, `fit`, `response`
- `/suggestions/send` — requires `session`, `association`, `item`, `note`
- `/suggestions/sent` — requires `session`
- `/suggestions/withdraw` — requires `session`, `pitch`
- `/wall/associate` — requires `session`, `label`, `description`, `visibility`
- `/wall/examples/add` — requires `session`, `association`, `item`, `role`, `note`, `qualities`
- `/wall/examples/remove` — requires `session`, `annotation`
- `/wall/examples/update` — requires `session`, `annotation`, `role`, `note`, `qualities`
- `/wall/examples/visibility` — requires `session`, `annotation`, `visibility`
- `/wall/list` — requires `session`
- `/wall/preview` — requires `session`
- `/wall/public` — requires `username`
- `/wall/remove` — requires `session`, `association`
- `/wall/update` — requires `session`, `association`, `label`, `description`
- `/wall/visibility` — requires `session`, `association`, `visibility`
- `/wall/visit` — requires `session`, `username`
