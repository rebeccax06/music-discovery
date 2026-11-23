# Sound It Out

Sound It Out helps friends show each other what a music word means to them. You pick a
word like “dreamy,” add songs that sound dreamy to you, and tap what you hear in each
one. The app writes a draft description from those picks. You share the word with
friends or with anyone. Friends listen and suggest songs, and you review each
suggestion privately and decide whether it joins your examples.

By Bhadra Rupesh, Sanskriti Singh, Rebecca Xiong, and Victor ([team](team.md)) for
6.1040, Fall 2026.

## F4 alpha deliverables

| Deliverable | Link or status |
| --- | --- |
| Source code | [Backend](src/) · [Frontend](web/) · [Shared](shared/) · [Tests](tests/) |
| Updated designs | [Concepts and compositions](#design) · [Decision log](design/decisions.md) · [How the concepts meet](design/alpha-integration.md) |
| Updated development plan | [F4 development plan](final-proj-deliverables/f4-development-plan.md): what is complete, what remains, who owns it, and how to deploy |
| Verification | [Saved results and their limits](design/verification/README.md) |
| Deployed app | *Public URL pending deployment.* |
| Narrated screen recording | [Watch or download the alpha recording](videos/f3-video.mov) |

## What works today

- Accounts: create one, sign in, stay signed in, sign out.
- Words: pick a suggested word or type your own. No description is required.
- Songs: choose from a checked library of 14 SoundCloud tracks, play them in
  SoundCloud's player, pick up to five qualities you hear, and add an optional note.
- A draft description written from your picks, never from the audio. Write your own
  to replace it.
- Sharing: choose who can open a word (only you, your friends, or anyone with the
  link) and which songs are shown. The Share panel shows what others will actually
  see.
- Friends: send, accept, decline, or cancel requests, see the words friends have
  opened to you, and remove a friend.
- Suggestions: suggest a song for a word you can open, follow whether it was
  reviewed, and withdraw it until then. Owners review privately and add a match to
  their examples as a separate step.

## Run it locally

You need [Bun](https://bun.sh) 1.4.2 and Docker (or Podman) for MongoDB. From the
repository root:

```sh
bun install --frozen-lockfile
docker compose up -d --wait mongo
bun run dev
```

Then open <http://127.0.0.1:3000>. `podman compose` works in place of
`docker compose`.

| Variable | Default | Set it when |
| --- | --- | --- |
| `MONGODB_URL` | `mongodb://dev:dev@127.0.0.1:27017/sound-it-out?authSource=admin` | You use another MongoDB. Include a database name. |
| `PORT` | `3000` | You need another port. |
| `PUBLIC_ORIGIN` | `http://127.0.0.1:<PORT>` | People open the app at any other address. No trailing slash. |
| `HOST` | `127.0.0.1`, or `0.0.0.0` when `NODE_ENV=production` | You need to listen on another interface. |

None of these is a secret, and no API keys are needed. `MONGODB_URI` is accepted in
place of `MONGODB_URL`. With `NODE_ENV=production`, the server refuses to start
without `PUBLIC_ORIGIN` and a database variable, and says which one is missing.

### Deploy

On the course platform the settings are: runtime Bun, package directory `.`, no build
script, start script `start`, port `3000`, health check `/health`, a MongoDB named
`MONGODB_URL`, and `PUBLIC_ORIGIN` set to the app's https address. Step-by-step
instructions and checks are in the [development plan](final-proj-deliverables/f4-development-plan.md#41-deploy-before-the-alpha-deadline).

## Test it

```sh
bun run check:design   # Check the concept and composition documents
bun run check          # Check the assembly, the generated API contract, and TypeScript
bun test               # Concept, draft, and HTTP tests on temporary databases
bun run test:e2e       # Browser journeys in Chrome on a temporary server and database
bun scripts/contrast.ts  # Contrast of every text color on every surface
bun run generate       # Regenerate the API docs and wire types after changing reactions
```

The tests need the MongoDB container running. Each test file creates its own database
and drops it afterward. The browser journeys use Google Chrome; set
`E2E_BROWSER=chromium` after `bunx playwright install chromium` to use Playwright's
own browser. To check a deployment, run `BASE_URL=https://… bun run test:e2e`.

Saved results and their limits: [design/verification](design/verification/README.md).

## Design

- [Product and implementation brief](final-proj-deliverables/mvp-product-and-implementation-brief.md): the plan this build follows.
- [Updated development plan](final-proj-deliverables/f4-development-plan.md): what is complete, what remains, and why the scope changed.
- [Decision log](design/decisions.md): what changed while building, why, and how each change was checked.
- [How the concepts meet](design/alpha-integration.md)
- [Application types](design/types.md)
- Concepts: [UserAuthenticating](design/concepts/UserAuthenticating.md), [Associating](design/concepts/Associating.md), [Annotating](design/concepts/Annotating.md), [Pitching](design/concepts/Pitching.md), [Friending](design/concepts/Friending.md)
- Compositions: [Accounts](design/compositions/Accounts.md), [Sound Wall](design/compositions/SoundWall.md), [Suggestions](design/compositions/Suggestions.md), [Friends](design/compositions/Friends.md)
- [Generated API documentation](generated/sound-it-out.md) and [wire types](generated/wire.ts)

F2 and F3 below are the submitted earlier deliverables. Where they differ from the
files under `design/`, the `design/` files describe the current app; the
[decision log](design/decisions.md) explains each difference.

### Repository layout

| Path | Contents |
| --- | --- |
| `design/` | Concept and composition specifications, decisions, verification |
| `src/` | Concepts, compositions (reactions and endpoints), HTTP setup, server |
| `shared/` | Code used by both server and browser: catalog, qualities, limits, draft |
| `web/` | Vue front end: composables for data, components for screens |
| `tests/` | Concept, HTTP, and browser tests |
| `generated/` | API documentation and types generated from the assembly; do not edit |
| `scripts/` | The contrast check |

## Final project deliverables

#### F2: Problem framing
* [Domain](final-proj-deliverables/f2.md#domain)
* [Bad situation](final-proj-deliverables/f2.md#bad-situation-two-friends-use-the-same-word-for-different-sounds)
* [Evidence](final-proj-deliverables/f2.md#evidence)
* [Workarounds and comparables](final-proj-deliverables/f2.md#workarounds-and-comparables)
* [Solution sketch](final-proj-deliverables/f2.md#solution-sketch)
* [Ethical analysis](final-proj-deliverables/f2.md#ethical-analysis)
* [References](final-proj-deliverables/f2.md#references)

#### F3: Concept design and planning
* [Problem framing](final-proj-deliverables/f2.md)
* [Concept design](final-proj-deliverables/sound-it-out-f3.md#concept-design)
* [User journey](final-proj-deliverables/sound-it-out-f3.md#user-journey)
* [Visual design study](final-proj-deliverables/sound-it-out-f3.md#visual-design-study)
  * [Color palette slide](final-proj-deliverables/visual-design/colorschemeslide1-visualdesign.png)
  * [Typography palette slide](final-proj-deliverables/visual-design/typographyslide2-visualdesign.png)
* [Design summary](final-proj-deliverables/sound-it-out-f3.md#design-summary)
* [Development plan](final-proj-deliverables/sound-it-out-f3.md#development-plan) (as submitted; [updated plan](final-proj-deliverables/f4-development-plan.md))
