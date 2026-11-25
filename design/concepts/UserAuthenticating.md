# UserAuthenticating

## Purpose

Let people return to their own account by proving they know its password or by
verifying their identity through Commons. A successful check issues a session
that lasts until it expires or they sign out.

## Principle

Ben *registers* a username and password, then *authenticates* to start a session.
Checking the *current* session identifies Ben. After he *logs out*, that session can no
longer identify him. Someone using the same username with different capitalization
cannot register a second account or change Ben's password.

Ali *starts Commons sign-in*, approves it at Commons, and *finishes* to start a
session. If her username is taken, she *chooses* an unused one. A later verified
sign-in reaches the same account even if her Commons username has changed.

## Types

```types
```

## State

```state
a set of Users with
  a username String
  a unique canonicalUsername String
  an optional verifier String
  an optional unique commonsIdentity String

a set of Sessions with
  a unique digest String
  a user User
  an expiresAt DateTime

a set of Attempts with
  a unique digest String
  a stateDigest String
  an optional verifier String
  an optional commonsIdentity String
  an expiresAt DateTime

Rule: Trim usernames, keep their displayed capitalization, and compare them in lowercase.
Rule: Passwords contain 8 to 128 Unicode code points and are used as supplied. Store only a salted Argon2id verifier.
Rule: A session credential is random. Store its digest and expire it seven days after issuance.
Rule: A Commons identity is the provider origin and stable subject. Only the provider can prove it. A matching username alone grants no access.
Rule: A Commons attempt and its state and verifier are separate random values. An attempt expires ten minutes after creation. Its verifier can be claimed for redemption once.
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
  where the password length is invalid, the username is unknown, the account has no password, or the password does not match
  then
    refuses INVALID_CREDENTIALS "The username or password is incorrect."
  where the password matches the account's verifier
  then
    bind user and the stored display username, create an unguessable session for user, and set expiresAt seven days from now
    returns user, username, session, expiresAt

startCommons() : returns (attempt: Attempt, address: String, expiresAt: DateTime)
  where Commons is unavailable
  then
    refuses COMMONS_SIGN_IN_REFUSED "Commons sign-in is unavailable."
  where Commons is configured
  then
    create a sign-in attempt and derive its provider address from state and the verifier challenge
    returns attempt, address, expiresAt

finishCommons(attempt: Attempt, state: String, code: String) : returns (user: User, username: String, session: Session, expiresAt: DateTime)
  where the browser has no active attempt with matching state and an unspent verifier, or the provider rejects the exchange
  then
    refuses COMMONS_SIGN_IN_REFUSED "Restart Commons sign-in."
  where the provider verifies a new identity but its username is invalid
  then
    retain the verified identity in the attempt for a later username choice
    refuses INVALID_USERNAME "Use 3 to 32 letters, numbers, underscores, or hyphens."
  where the provider verifies a new identity but its username is taken
  then
    retain the verified identity in the attempt for a later username choice
    refuses USERNAME_TAKEN "That username is already taken."
  where the verified identity already has an account, or its username can be registered
  then
    use the linked account or create a passwordless account with the identity
    consume the attempt and issue the same kind of session as password sign-in
    returns user, username, session, expiresAt

chooseCommonsUsername(attempt: Attempt, username: String) : returns (user: User, username: String, session: Session, expiresAt: DateTime)
  where the browser has no active verified attempt
  then
    refuses COMMONS_SIGN_IN_REFUSED "Restart Commons sign-in."
  where the verified identity is new and the chosen username is invalid
  then
    refuses INVALID_USERNAME "Use 3 to 32 letters, numbers, underscores, or hyphens."
  where the verified identity is new and the chosen username is taken
  then
    refuses USERNAME_TAKEN "That username is already taken."
  where the verified identity already has an account, or the chosen username can be registered
  then
    use the linked account or create a passwordless account with the identity
    consume the attempt and issue a session
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

_username(user: User) : optional (username: String)
  Returns the stored display username of user, or no row when no such user exists.
```
