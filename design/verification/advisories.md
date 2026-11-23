# Engine advisories

`bun run check` passes, and the sync-engine checker also reports 31 advisories: 27
warnings and 4 notices. Each was reviewed. None is a defect, for the reasons below, and
each reason names the test that would catch it if it stopped being true.

[`scripts/advisories.ts`](../../scripts/advisories.ts) runs as part of `bun run check`.
It compares the checker's advisories with the reviewed list in
[advisories.json](advisories.json) and fails on any advisory that is new or no longer
reported. A change that introduces an advisory cannot pass until someone reviews it,
explains it here, and runs `bun scripts/advisories.ts --update`.

## `MISSING_ENDPOINT_FALLBACK` (27 warnings, one per endpoint path)

> Endpoint … has no recognized total answer path; an admitted request can time out when
> every answer guard drops.

**What the checker can prove.** Its coverage proof recognizes a chain of actions only
when every action's output pattern is empty. Every endpoint in this app first runs
`Sessioning.use({ session, at }).responds({ subject: user })` or a similar step that
binds a result, so the checker cannot follow the chain and reports every endpoint.
The engine's documentation says the analyzer "does not prove arbitrary view,
computation, validator, action-outcome, or concurrent-state logic"
(`node_modules/@mit-sdg/sync-engine/docs/user/reference/semantics.md`, "Sibling paths
and endpoint settlement").

**Why every admitted request is answered.** There are two shapes.

*Linear endpoints.* Each action either returns, which moves to the next stage;
refuses, which the engine's built-in `DeliverRefusalToAsker` reaction answers with the
refusal code; or faults, which `DeliverFaultToAsker` answers with `INTERNAL_ERROR`.
Both built-ins are listed in the [generated read-back](../../generated/sound-it-out.md).
The final `respond` uses only bound values and record formers, which always produce
exactly one record.

| Endpoint | Path |
| --- | --- |
| Accounts.Me, Logout | `/auth/me`, `/auth/logout` |
| SoundWall.Definitions.* | `/wall/associate`, `/wall/update`, `/wall/visibility`, `/wall/remove` |
| SoundWall.Examples.UpdateExample, SetExampleVisibility, RemoveExample | `/wall/examples/update`, `/wall/examples/visibility`, `/wall/examples/remove` |
| SoundWall.Reading.ListWall, PreviewWall | `/wall/list`, `/wall/preview` |
| Suggestions.Sending.ListSent, Withdraw | `/suggestions/sent`, `/suggestions/withdraw` |
| Suggestions.Reviewing.Review | `/suggestions/review` |
| Friends.Circle.List | `/friends/list` |

*Branched endpoints.* After the session step (or, for register and sign-in, at the start), sibling branches split the cases. Each
set of guards is complementary: for any stored state, exactly one branch matches.

| Endpoint | Branches and guards | Complement |
| --- | --- | --- |
| `/auth/register` | `acceptable-password`: `Authenticating._acceptable` is `true`. `unacceptable-password`: it is `false` | A flag has exactly one value |
| `/auth/login` | `known-username`: the username exists. `unknown-username`: `no(` the same `)` | Exact negation |
| `/wall/public` | `ReadPublicWall`: the username exists. `MissingWall`: `no(` the username exists `)` | Exact negation |
| `/wall/examples/add` | `own-word`: the word's owner is the actor. `not-own-word`: `no(` the same `)` | Exact negation |
| `/wall/visit` | `friend`: owner exists and is a friend. `not-friend`: owner exists and `no(` friend `)`. `no-wall`: `no(` owner exists `)` | Partition of three cases |
| `/suggestions/send` | `public-word`: visibility is `PUBLIC`. `friends-word`: `LIMITED` and the sender is the owner's friend. `no-open-word`: `no(PUBLIC)` and `no(friendsWord)` | The third is the negation of the first two together; `friendsWord` is the same condition as the second |
| `/suggestions/promote` | `own-match`: the actor is the recipient and the fit is `MATCH`. `not-own-match`: `no(` the same `)` | Exact negation |
| `/friends/request`, `accept`, `decline`, `cancel`, `remove` | `known`: the username exists. `unknown`: `no(` the same `)` | Exact negation |

**The one way a request could go unanswered.** Sibling guards do not read one shared
snapshot. If the state they read changes between their evaluations, for example a word
made private at that instant, every guard could drop and the request would go
unanswered.

- *How narrow the window is.* The engine memoizes a query per concept and arguments
  until an action on that concept runs. Guards that read the same query in one request
  therefore see the same answer, unless an action on that very concept lands between
  their reads.
- *How often it happened.* `tests/integration/guard-race.test.ts` sends 400
  suggestions while the word flips between public and private on every one, and makes
  100 wall visits while a friendship is made and ended underneath each. Saved run:
  0 unanswered and 0 wrong answers in 500 attempts
  ([tests.txt](tests.txt)). The test fails if any request goes unanswered for 3 seconds,
  so a regression that widens the window would be caught. This was measured locally,
  not on the host.
- *What the person sees if it does happen.* The engine answers after 30 seconds with
  `TIMED_OUT`, which the HTTP adapter sends as `500 INTERNAL_ERROR`. Every guard
  dropped before any action ran, so nothing was written and trying again is safe.
  Journey D in the browser makes a suggestion fail with exactly that answer, and checks
  that the person sees "Could not send your suggestion. Your pick is still here. Try
  again.", that their note is kept, and that sending again succeeds.

**What would catch a real gap.** The privacy sweep (`tests/integration/privacy.test.ts`)
calls every route as four kinds of reader. Each test has a 15-second limit, shorter
than the engine's 30-second timeout, so any route that leaves a request unanswered
fails the suite. The sweep also fails when a route is added without being added to it.
The other HTTP tests drive each branch above: wrong owner, private word, missing word,
friend and non-friend, unknown username.

## `ORDER_SENSITIVE_FORMER` (4 notices)

> Former … contains a source-order-sensitive selection.

The checker flags every former that arranges rows, because rows with equal sort keys
keep the order the query returned them in. Each list here is sorted by a field that is
unique within it, so no two rows tie:

| Former | Sorted by | Why it is unique |
| --- | --- | --- |
| the personal sound wall | words by label; songs by annotation; suggestions by pitch | One word per person and normalized label (unique index); identities are random UUIDs |
| the sound wall of (user) open to (levels) | words by label; songs by annotation | Same as above |
| the suggestions (user) has sent | pitch | Random UUID |
| the friends and requests of (user) | username | Usernames are unique, ignoring case (unique index) |

The HTTP tests compare whole responses with `toEqual`, including order, so a change
that made the order unstable would fail them.
