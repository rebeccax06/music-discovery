# Friends

Two people become friends when one asks and the other accepts. Friends can find each
other's walls from inside the app, and a word's owner can share it with friends
without making it public.

The session identifies the actor in every request. People are named by username; the
composition resolves the name, and Friending sees only identities. A username that
does not exist receives `PERSON_NOT_FOUND`.

## The circle

A person can [list their circle](reaction:Friends.Circle.List):
[their friends and the requests waiting in each direction](former:Friends.Circle.Circle),
each by username in username order. Each friend comes with the words that friend has
opened to them, read through the same [visible-wall former](former:SoundWall.Reading.VisibleWall)
at the friends' levels, so the circle shows exactly what visiting each wall would.
Nobody can list another person's circle.

```endpoints
Friends.Circle.List at /friends/list
```

## Requests

A person can [ask someone to be their friend](reaction:Friends.Requests.Request).
Friending refuses a request to oneself, to a friend, to someone already asked, and to
someone who has already asked first; in the last case the interface offers to accept
instead. The recipient can [accept](reaction:Friends.Requests.Accept) or
[decline](reaction:Friends.Requests.Decline), and the sender can
[cancel](reaction:Friends.Requests.Cancel) while the request is waiting. Each of these
names the other person; the session's user is always the one acting, so nobody can
accept a request made to someone else. A decline or a cancellation leaves nothing
behind, and the same person can be asked again.

```endpoints
Friends.Requests.Request at /friends/request
Friends.Requests.Accept at /friends/accept
Friends.Requests.Decline at /friends/decline
Friends.Requests.Cancel at /friends/cancel
```

## Leaving

Either friend can [end the friendship](reaction:Friends.Leaving.Remove). It ends for
both at once. From then on neither can open the other's friends' words, because
every read of a wall asks Friending at that moment; nothing about the friendship is
copied into a word. Suggestions already sent stay with the word's owner, who can
still review them.

```endpoints
Friends.Leaving.Remove at /friends/remove
```

## What friendship grants

Friendship changes two decisions, both made in other compositions by reading
`Friending._friendship`:

- which words a signed-in visitor receives from someone's wall
  ([Sound Wall](SoundWall.md#reading)); and
- who may suggest a song for a word limited to friends
  ([Suggestions](Suggestions.md#sending)).

Associating stores a word's visibility as `PRIVATE`, `LIMITED`, or `PUBLIC` and does
not know what the limited audience is. Binding `LIMITED` to "the owner's friends" is
this application's decision.
