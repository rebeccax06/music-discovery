# Engine advisories

`bun run check` passes, and the sync-engine checker also reports 30 advisories: 26
warnings and 4 notices. Each was reviewed. None is a defect, for the reasons below, and
each reason names the test that would catch it if it stopped being true.

[`scripts/advisories.ts`](../../scripts/advisories.ts) runs as part of `bun run check`.
It compares the checker's advisories with the reviewed list in
[advisories.json](advisories.json) and fails on any advisory that is new or no longer
reported. A change that introduces an advisory cannot pass until someone reviews it,
explains it here, and runs `bun scripts/advisories.ts --update`.

## `MISSING_ENDPOINT_FALLBACK` (26 warnings, one per endpoint path)

> Endpoint … has no recognized total answer path; an admitted request can time out when
> every answer guard drops.

**What the checker can prove.** Its coverage proof recognizes a chain of actions only
when every action's output pattern is empty. Every endpoint in this app first runs
`UserAuthenticating.current({ session }).responds({ user })` or a similar step that
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
| Accounts.Register, Login, Me | `/auth/register`, `/auth/login`, `/auth/me` |
| SoundWall.Definitions.* | `/wall/associate`, `/wall/update`, `/wall/visibility`, `/wall/remove` |
| SoundWall.Examples.UpdateExample, SetExampleVisibility, RemoveExample | `/wall/examples/update`, `/wall/examples/visibility`, `/wall/examples/remove` |
| SoundWall.Reading.ListWall, PreviewWall | `/wall/list`, `/wall/preview` |
| Suggestions.Sending.ListSent, Withdraw | `/suggestions/sent`, `/suggestions/withdraw` |
| Suggestions.Reviewing.Review | `/suggestions/review` |
| Friends.Circle.List | `/friends/list` |

*Branched endpoints.* After the session step, sibling branches split the cases. Each
set of guards is complementary: for any stored state, exactly one branch matches.

| Endpoint | Branches and guards | Complement |
| --- | --- | --- |
| `/wall/public` | `ReadPublicWall`: the username exists. `MissingWall`: `no(` the username exists `)` | Exact negation |
| `/wall/examples/add` | `own-word`: the word's owner is the actor. `not-own-word`: `no(` the same `)` | Exact negation |
| `/wall/visit` | `friend`: owner exists and is a friend. `not-friend`: owner exists and `no(` friend `)`. `no-wall`: `no(` owner exists `)` | Partition of three cases |
| `/suggestions/send` | `public-word`: visibility is `PUBLIC`. `friends-word`: `LIMITED` and the sender is the owner's friend. `no-open-word`: `no(PUBLIC)` and `no(friendsWord)` | The third is the negation of the first two together; `friendsWord` is the same condition as the second |
| `/suggestions/promote` | `own-match`: the actor is the recipient and the fit is `MATCH`. `not-own-match`: `no(` the same `)` | Exact negation |
| `/friends/request`, `accept`, `decline`, `cancel`, `remove` | `known`: the username exists. `unknown`: `no(` the same `)` | Exact negation |

**The one way a request could go unanswered.** Sibling guards do not read one shared
snapshot. If the state they read changes between their evaluations, for example a word
made private at that instant, both guards could drop. The engine would then answer
`TIMED_OUT` after 30 seconds, and the interface would show the action's "try again"
message. This needs a concurrent change in a window of microseconds, has no lasting
effect, and is accepted.

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
