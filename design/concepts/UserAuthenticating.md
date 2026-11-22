# UserAuthenticating

## Purpose

Let people return to their own account by proving they know its password. A successful
check issues a session so they can keep working until it expires or they sign out.

## Principle

Ben *registers* a username and password, then *authenticates* to start a session.
Checking the *current* session identifies Ben. After he *logs out*, that session can no
longer identify him. Someone using the same username with different capitalization
cannot register a second account or change Ben's password.

## Types

```types
```

## State

```state
a set of Users with
  a username String
  a unique canonicalUsername String
  a verifier String

a set of Sessions with
  a unique digest String
  a user User
  an expiresAt DateTime

Rule: Trim usernames, keep their displayed capitalization, and compare them in lowercase.
Rule: Passwords contain 8 to 128 Unicode code points and are used as supplied. Store only a salted Argon2id verifier.
Rule: A session credential is random. Store its digest and expire it seven days after issuance.
```

## Actions

```actions
register(username: String, password: String) : returns (user: User)
  where the trimmed username is not 3 to 32 ASCII letters, digits, underscores, or hyphens
  then
    refuses INVALID_USERNAME "Use 3 to 32 letters, numbers, underscores, or hyphens."
  where the password is shorter than 8 or longer than 128 code points
  then
    refuses INVALID_PASSWORD "Use a password with 8 to 128 characters."
  where the canonical username already exists
  then
    refuses USERNAME_TAKEN "That username is already taken."
  where the username and password are valid and the canonical username is unused
  then
    create a new user and its password verifier in one write
    returns user

authenticate(username: String, password: String) : returns (user: User, username: String, session: Session, expiresAt: DateTime)
  where the password length is invalid, the username is unknown, or the password does not match
  then
    refuses INVALID_CREDENTIALS "The username or password is incorrect."
  where the password matches the account's verifier
  then
    bind user and the stored display username, create an unguessable session for user, and set expiresAt seven days from now
    returns user, username, session, expiresAt

current(session: Session) : returns (user: User, username: String)
  where the session is missing, expired, or ended
  then
    refuses UNKNOWN_SESSION "Sign in to continue."
  where the session is active
  then
    bind its user and that user's display username
    returns user, username

logout(session: Session) : returns ()
  where the session is missing, expired, or ended
  then
    refuses UNKNOWN_SESSION "Sign in to continue."
  where the session is active
  then
    remove that session
    returns
```

## Queries

```queries
_byUsername(username: String) : optional (user: User, name: String)
  Returns the user whose canonical username matches the trimmed, lowercased input, with its stored display username, or no row when no such user exists.
```
