# Sessioning

## Purpose

Let people stay signed in across requests without sending their password each time.

*Prevents:* someone keeps using a session after signing out; someone who finds a session
left open on a shared computer, or copies one, keeps using it indefinitely; someone who
reads the stored data can use a session; someone who comes back after a few days has to
sign in again.

## Principle

After Maya proves who she is, a session is *started* for her. Each time she sends a
request with the session, Sessioning *uses* it, returns her as the person it belongs to,
and records when she last used it. When she signs out, the session *ends*, and any later
request that carries it is refused. She forgets to sign out on a library computer;
nobody uses that session for a week, and then it is refused. She uses the session on her
own laptop every day, but ninety days after it started, that one is refused too, and she
signs in again.

## Types

```types
external Subject
  The person a session belongs to.
```

## State

```state
a set of Sessions with
  a Subject
  a lastUsed DateTime
  an expiresAt DateTime

Rule: A session's identity is a random, unguessable credential, and it is all a person sends to use the session.
Rule: Sessioning stores only the SHA-256 digest of each credential, never the credential itself, and finds a presented session by its digest.
Rule: A session is usable at an instant when it was last used less than 7 days before that instant and the instant is before expiresAt. Every action receives the instant it acts at.
Rule: Sessioning may delete a session at any time once it can no longer be used.
```

## Actions

```actions
start(subject: Subject, at: DateTime) : returns (session: Session, expiresAt: DateTime)
  where true
  then
    add a new session for subject, last used at, that expires 90 days after at
    returns session, expiresAt

use(session: Session, at: DateTime) : returns (subject: Subject)
  where session is unknown, was last used 7 days or more before at, or expiresAt is not after at
  then
    refuses NOT_SIGNED_IN "Sign in to continue."
  where session is usable at at
  then
    set the session's lastUsed to the later of its stored lastUsed and at
    returns subject

end(session: Session, at: DateTime) : returns (session: Session)
  where session is unknown, was last used 7 days or more before at, or expiresAt is not after at
  then
    refuses SESSION_ENDED "Sign in to continue."
  where session is usable at at
  then
    remove session
    returns session
```

## Queries

```queries
```
