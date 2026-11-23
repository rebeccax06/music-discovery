# Accounts

An account is three things kept by three concepts that never refer to each other:
Registering holds the username and allocates the user, Authenticating holds the
password verifier for that user, and Sessioning holds the sessions that let the user
stay signed in. Accounts composes them. Every flow that touches a session passes it the
request's [current instant](computation:currentInstant).

## Signing up

[Register](reaction:Accounts.Register) takes a username and a password and signs the new
person in, so a new user enters the app in one request. It first asks
`Authenticating._acceptable` about the password, exactly as supplied. An unacceptable
password is refused with `INVALID_PASSWORD` before anyone is registered, because the
engine does not undo `Registering.register` when a later action in the same request is
refused. Otherwise it registers the username with Registering, which refuses
`INVALID_USERNAME` or `USERNAME_TAKEN` (also for a username that differs from an
existing one only in capitalization) and writes nothing. It then sets the password for
the new user with `Authenticating.set` and starts a session for that user with
`Sessioning.start`. Only after the session has started does it answer with the user.

The three writes commit separately. If `Authenticating.set` fails after the username is
registered, which only an infrastructure fault can cause because the password was
already accepted, the username is held by a user with no password; signing in as that
user is refused like any other failed sign-in, and nothing repairs it. If
`Sessioning.start` fails after the password is set, the account is complete but the
request is still refused. Repeating the registration is refused with
`USERNAME_TAKEN`. So when registration fails with anything other than
`INVALID_USERNAME`, `INVALID_PASSWORD`, or `USERNAME_TAKEN`, the account may already
exist, and the browser offers sign-in with the entered username.

## Signing in

[Login](reaction:Accounts.Login) looks up the user with `Registering._byUsername`, which
ignores surrounding spaces and capitalization, checks the password with
`Authenticating.authenticate`, and starts a new session with `Sessioning.start`. It
answers, after the session has started, with the user.
A username nobody has is refused with `INVALID_CREDENTIALS`, the same refusal and the
same message as a wrong password, so a caller cannot tell which usernames exist. A user
without a password is refused the same way. Nothing is written before the session
starts.

## The session cookie

Register and Login also produce the session and its expiry. The HTTP policy moves both
out of the answer into an HttpOnly cookie that the page's scripts cannot read. For
endpoints that issue, read, or clear the cookie, the HTTP policy requires the configured
origin and supplies the session from the cookie, never from the request's inputs.
Neither Register nor Login answers with the display username: right after either
succeeds, the browser calls Me to learn it.

[Me](reaction:Accounts.Me) uses the cookie's session with `Sessioning.use`, which also
records the use, and answers with the user and the display username from
`Registering._username`. [Logout](reaction:Accounts.Logout) ends the cookie's session
with `Sessioning.end`, and the HTTP policy clears the cookie. Other sessions of the same
user, on other computers, stay signed in.

## Protected requests

Every protected reaction in this application, including those in
[Friends](Friends.md), [Sound Wall](SoundWall.md), and [Suggestions](Suggestions.md),
first resolves its actor with `Sessioning.use` on the cookie's session and acts only on
the subject it returns. A missing, ended, idle, or expired session is refused with
`NOT_SIGNED_IN` before any other action runs. A reaction that needs the actor's username
reads it with `Registering._username`, and one that names another person by username
resolves that person with `Registering._byUsername`.

```endpoints
Accounts.Register at /auth/register
Accounts.Login at /auth/login
Accounts.Me at /auth/me
Accounts.Logout at /auth/logout
```
