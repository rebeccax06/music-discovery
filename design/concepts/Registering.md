# Registering

## Purpose

Let people choose a username that others can find them by.

*Prevents:* two people end up with the same username, including two usernames that
differ only in capitalization.

## Principle

Maya *registers* the username ` Maya ` and is known as `Maya`. When Sam types `maya`
to send her a friend request, Registering returns Maya's user, and `Maya` appears
beside the words she shares with him. Ben tries to register `MAYA`, and is refused with
"That username is already taken.", so he registers `ben`.

## Types

```types
```

## State

```state
a set of Users with
  a username String
  a unique canonicalUsername String

Rule: A username is trimmed before it is checked or stored. The stored username keeps the capitalization the person typed, and canonicalUsername is that trimmed username in lowercase.
Rule: Users are never removed, so a username, once taken, stays taken.
```

## Actions

```actions
register(username: String) : returns (user: User)
  where the trimmed username is not 3 to 32 ASCII letters, digits, underscores, or hyphens
  then
    refuses INVALID_USERNAME "Use 3 to 32 letters, numbers, underscores, or hyphens."
  where some user has the lowercase trimmed username as canonicalUsername
  then
    refuses USERNAME_TAKEN "That username is already taken."
  where the trimmed username is accepted and no user has its lowercase form as canonicalUsername
  then
    add a new user with the trimmed username and its lowercase form as canonicalUsername
    returns user
```

## Queries

```queries
_byUsername(username: String) : optional (user: User, username: String)
  Returns the user whose canonicalUsername equals the trimmed, lowercased input, with that user's stored display username.
  Returns no row when nobody has that username.

_username(user: User) : optional (username: String)
  Returns the user's stored display username.
  Returns no row for an unknown user.
```
