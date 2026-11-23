# Alpha integration

How the concepts are connected in the running app, and what is left before the alpha
is complete. Decisions and their checks are in the [decision log](decisions.md);
results are in [verification](verification/README.md).

## Scope of this build

- **Songs are whole tracks.** Excerpting from F3 is deferred; nothing in this build
  selects or plays part of a track ([D4](decisions.md#d4-whole-tracks-now-excerpting-later)).
- **Descriptions come from picked qualities, not from the audio.** The draft is a
  sentence built from the qualities the owner tapped. No model listens to, analyzes, or
  receives any SoundCloud content ([D1](decisions.md#d1-the-draft-description-is-computed-never-stored)).
- **The library is 14 checked tracks**, not a search of SoundCloud.
- **The specifications match this commit.** `bun run check` fails if the concept
  specifications, the compositions, and the generated API documentation disagree with
  the code, or if an engine advisory has not been reviewed.

## Accounts

F3 described setting a password for an existing identity. The implementation creates
the user and writes its verifier in one registration action, and a second action
proves the password and issues a session. Registration therefore cannot half-succeed.
If signing in fails after registering, the form keeps the username and offers sign-in
again.

Every protected reaction resolves its actor with `UserAuthenticating.current` from the
session cookie. No route accepts a user identity in the request body. The HTTP adapter
supplies the session from an HttpOnly cookie and checks the request origin on routes
that use it.

## How the concepts meet

| Concept | Owns | Receives from the application |
| --- | --- | --- |
| [UserAuthenticating](concepts/UserAuthenticating.md) | Accounts and sessions | — |
| [Associating](concepts/Associating.md) | Words, their descriptions, and who may open them | The owner's identity |
| [Annotating](concepts/Annotating.md) | Songs in a word: role, note, qualities, shown or not | Author, track, and word as opaque identities |
| [Pitching](concepts/Pitching.md) | Suggestions and their private reviews | Contributor, recipient, word, and track as opaque identities |
| [Friending](concepts/Friending.md) | Friend requests and friendships | Two people as opaque identities |

No concept imports or calls another. The compositions connect them:

| Composition | Decides |
| --- | --- |
| [Accounts](compositions/Accounts.md) | Registration, sign-in, and sessions |
| [Sound Wall](compositions/SoundWall.md) | Only a word's owner changes it or its songs; who reads which words, through one former for every reader other than the owner |
| [Suggestions](compositions/Suggestions.md) | Who may suggest for a word (anyone for a public word, friends for a friends' word); only the recipient reviews; adding a match is a separate step |
| [Friends](compositions/Friends.md) | Resolving usernames; what friendship grants |

Removing a word runs `Associating.remove`, then `Annotating.clearContext`, then
`Pitching.clearTarget` in one request. They commit separately. The relation they
maintain, and the repair that covers a late write, are recorded in the composition
documents ([D3](decisions.md#d3-no-cross-concept-transactions)).

## Music

The catalog is 14 tracks in [shared/catalog.ts](../shared/catalog.ts). Each identity
came from SoundCloud's oEmbed endpoint for the track's page on November 22, 2026. The
server accepts only catalog tracks, so a player address is never built from text a
person typed. The page restricts frames to `https://w.soundcloud.com`. Playback uses
SoundCloud's documented widget; nothing is downloaded, and no SoundCloud content is
sent to any model.

## Before the alpha is complete

Owners and step-by-step instructions are in the
[updated development plan](../final-proj-deliverables/f4-development-plan.md#4-remaining-work).

- **Deploy.** On the class host, use the root package, Bun, the `start` script, port
  3000, and `/health`. Name the platform's database variable `MONGODB_URL`
  (`MONGODB_URI` also works) and set `PUBLIC_ORIGIN`. The database does not need
  transactions, and the server keeps at most 5 of its 10 allowed connections. See the
  [course deployment guide](https://61040.github.io/fa26/resources/deploying-apps/).
- **Check the deployment** with `BASE_URL=<public URL> bun run test:e2e`, then sign in
  by hand in Safari and Firefox.
- **Record** the narrated demo on the deployed build and link it from the README.
- **Run sessions with people** as the F3 validation plan describes, and record what
  happened.
