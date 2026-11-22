<!-- Generated from the Sound It Out assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# Sound It Out — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Annotating

Defined in [Annotating](../design/concepts/Annotating.md), line 1.

#### Actions

- `annotate(author: Author, item: Item, context: Context, role: Role, note: String) : returns (annotation: Annotation)`
  - Refuses `INVALID_NOTE`: Explain why this example matters.
  - Refuses `ANNOTATION_EXISTS`: This item is already included here.
- `update(author: Author, annotation: Annotation, role: Role, note: String) : returns ()`
  - Refuses `UNKNOWN_ANNOTATION`: This annotation could not be found.
  - Refuses `NOT_AUTHOR`: You cannot edit another user's annotation.
  - Refuses `INVALID_NOTE`: Explain why this example matters.
- `setVisibility(author: Author, annotation: Annotation, visibility: Visibility) : returns ()`
  - Refuses `UNKNOWN_ANNOTATION`: This annotation could not be found.
  - Refuses `NOT_AUTHOR`: You cannot edit another user's annotation.
- `remove(author: Author, annotation: Annotation) : returns ()`
  - Refuses `UNKNOWN_ANNOTATION`: This annotation could not be found.
  - Refuses `NOT_AUTHOR`: You cannot edit another user's annotation.
- `clearContext(context: Context) : returns ()`

#### Queries

- `_get(annotation: Annotation) : optional (author: Author, item: Item, context: Context, role: Role, note: String, visibility: Visibility)`
- `_forContext(context: Context) : many (annotation: Annotation, author: Author, item: Item, role: Role, note: String, visibility: Visibility)`

#### Instances

- `Annotating` — instance of `Annotating` — [Application types](../design/types.md), line 20.
  - `Author` is `UserAuthenticating.User` — [Application types](../design/types.md), line 21.
  - `Context` is `Associating.Association` — [Application types](../design/types.md), line 23.
  - `Item` is `SoundExcerpt` — [Application types](../design/types.md), line 22.

### Associating

Defined in [Associating](../design/concepts/Associating.md), line 1.

#### Actions

- `associate(user: User, label: String, description: String, visibility: Visibility) : returns (association: Association)`
  - Refuses `INVALID_ASSOCIATION`: Provide a word and a description.
  - Refuses `ASSOCIATION_EXISTS`: You have already defined this word.
- `update(user: User, association: Association, label: String, description: String) : returns ()`
  - Refuses `UNKNOWN_ASSOCIATION`: This word could not be found.
  - Refuses `NOT_OWNER`: You cannot edit another user's definition.
  - Refuses `INVALID_ASSOCIATION`: Provide a word and a description.
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

- `Associating` — instance of `Associating` — [Application types](../design/types.md), line 17.
  - `User` is `UserAuthenticating.User` — [Application types](../design/types.md), line 18.

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

#### Instances

- `UserAuthenticating` — instance of `UserAuthenticating` — [Application types](../design/types.md), line 15.

## Application types

Concrete types:

- `SoundExcerpt` — [Application types](../design/types.md), line 10.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### a public sound wall (user)

Authored path: `SoundWall.Reading.PublicWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 29.

```former
Former "a public sound wall (user)" — inputs (user); bindings (association, label, description, annotation, item, role, note); promises exactly one record — forms:
  a record of
    words: each Associating._byUser (user) has (association, description, label, visibility: "PUBLIC")
      arranged by label
      form a record of
        association
        description
        examples: each Annotating._forContext (context: association) has (annotation, item, note, role, visibility: "SHARED")
          arranged by annotation
          form a record of
            annotation
            item
            note
            role
        label
```

### the personal sound wall (user)

Authored path: `SoundWall.Reading.PersonalWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 25.

```former
Former "the personal sound wall (user)" — inputs (user); bindings (association, label, description, visibility, annotation, author, item, role, note, exampleVisibility); promises exactly one record — forms:
  a record of
    words: each Associating._byUser (user) has (association, description, label, visibility)
      arranged by label
      form a record of
        association
        description
        examples: each Annotating._forContext (context: association) has (annotation, author, item, note, role, visibility: exampleVisibility)
          arranged by annotation
          form a record of
            annotation
            author
            item
            note
            role
            visibility: exampleVisibility
        label
        visibility
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

### SoundWall.Definitions.Associate

Authored path: `SoundWall.Definitions.Associate`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 4.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 18.

```reaction
when RequestBoundary.request (description, label, path: "/wall/associate", requestId, session, visibility)
then
  UserAuthenticating.current (session)
```

### SoundWall.Definitions.Associate#2

Authored path: `SoundWall.Definitions.Associate`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 4.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 18.

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
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 18.

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
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 12.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 21.

```reaction
when RequestBoundary.request (association, path: "/wall/remove", requestId, session)
then
  UserAuthenticating.current (session)
```

### SoundWall.Definitions.RemoveWord#2

Authored path: `SoundWall.Definitions.RemoveWord`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 7.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 12.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 21.

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
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 12.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 21.

```reaction
when Associating.remove (association, user), asked by SoundWall.Definitions.RemoveWord#2
then
  Annotating.clearContext (context: association)
```

### SoundWall.Definitions.RemoveWord#4

Authored path: `SoundWall.Definitions.RemoveWord`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 7.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 12.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 21.

```reaction
when Annotating.clearContext (context: association), asked by SoundWall.Definitions.RemoveWord#3
where
  earlier, RequestBoundary.request (association, path: "/wall/remove", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### SoundWall.Definitions.SetVisibility

Authored path: `SoundWall.Definitions.SetVisibility`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 6.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 20.

```reaction
when RequestBoundary.request (association, path: "/wall/visibility", requestId, session, visibility)
then
  UserAuthenticating.current (session)
```

### SoundWall.Definitions.SetVisibility#2

Authored path: `SoundWall.Definitions.SetVisibility`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 6.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 20.

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
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 20.

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
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 19.

```reaction
when RequestBoundary.request (association, description, label, path: "/wall/update", requestId, session)
then
  UserAuthenticating.current (session)
```

### SoundWall.Definitions.UpdateWord#2

Authored path: `SoundWall.Definitions.UpdateWord`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 5.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 19.

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
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 19.

```reaction
when Associating.update (association, description, label, user), asked by SoundWall.Definitions.UpdateWord#2
where
  earlier, RequestBoundary.request (association, description, label, path: "/wall/update", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### SoundWall.Reading.ListWall

Authored path: `SoundWall.Reading.ListWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 24.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 36.

```reaction
when RequestBoundary.request (path: "/wall/list", requestId, session)
then
  UserAuthenticating.current (session)
```

### SoundWall.Reading.ListWall#2

Authored path: `SoundWall.Reading.ListWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 24.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 36.

```reaction
when UserAuthenticating.current (session, user), asked by SoundWall.Reading.ListWall
where
  earlier, RequestBoundary.request (path: "/wall/list", requestId, session)
then
  RequestBoundary.respond (requestId, wall: former "the personal sound wall (user)" with (user))
```

### SoundWall.Reading.MissingWall

Authored path: `SoundWall.Reading.MissingWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 33.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 38.

```reaction
when RequestBoundary.request (path: "/wall/public", requestId, username)
where
  no UserAuthenticating._byUsername (username)
then
  RequestBoundary.respond (error: "WALL_NOT_FOUND", requestId)
```

### SoundWall.Reading.ReadPublicWall

Authored path: `SoundWall.Reading.ReadPublicWall`.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 28.
- Covered by [Sound Wall](../design/compositions/SoundWall.md), line 37.

```reaction
when RequestBoundary.request (path: "/wall/public", requestId, username)
where
  UserAuthenticating._byUsername (username) has (name, user)
then
  RequestBoundary.respond (owner: name, requestId, wall: former "a public sound wall (user)" with (user))
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
- `/wall/associate` — requires `session`, `label`, `description`, `visibility`
- `/wall/list` — requires `session`
- `/wall/public` — requires `username`
- `/wall/remove` — requires `session`, `association`
- `/wall/update` — requires `session`, `association`, `label`, `description`
- `/wall/visibility` — requires `session`, `association`, `visibility`
