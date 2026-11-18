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
  - `Context` is `SoundWord` — [Application types](../design/types.md), line 23.
  - `Item` is `SoundExcerpt` — [Application types](../design/types.md), line 22.

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

#### Instances

- `UserAuthenticating` — instance of `UserAuthenticating` — [Application types](../design/types.md), line 18.

## Application types

Concrete types:

- `SoundExcerpt` — [Application types](../design/types.md), line 10.
- `SoundWord` — [Application types](../design/types.md), line 13.

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

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/auth/login` — requires `username`, `password`
- `/auth/logout` — requires `session`
- `/auth/me` — requires `session`
- `/auth/register` — requires `username`, `password`
