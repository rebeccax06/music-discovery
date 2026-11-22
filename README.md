# Sound It Out

Sound It Out is a personal music dictionary. Define a word such as “dreamy,” attach a
song excerpt, and explain what the excerpt conveys to you.

## Run locally

Install Bun 1.4.2 and a Docker Compose-compatible runtime. From this directory run:

```sh
bun install --frozen-lockfile
docker compose up -d --wait mongo
bun run dev
```

Open `http://127.0.0.1:3000`. You can use `podman compose` in place of `docker compose`.
To use another local MongoDB, set `MONGODB_URL` to a connection string with a database
name. If you change `PORT` or use another browser origin, set `PUBLIC_ORIGIN` to the
address people open, without a trailing slash.

```sh
bun run check:design  # Check the concept and composition documents
bun run generate      # Regenerate the API docs and wire types after contract changes
bun run check         # Check the assembly, generated artifacts, and TypeScript
bun test              # Run behavioral and integration tests against local MongoDB
```

The tests use temporary databases and drop those databases when done. Run them against
a local MongoDB with permission to create and drop test databases.

## Application design

- [Application types](design/types.md)
- [UserAuthenticating concept](design/concepts/UserAuthenticating.md)
- [Associating concept](design/concepts/Associating.md)
- [Annotating concept](design/concepts/Annotating.md)
- [Accounts composition](design/compositions/Accounts.md)
- [Sound Wall composition](design/compositions/SoundWall.md)
- [Generated API documentation](generated/sound-it-out.md) and [wire types](generated/wire.ts)
- [Alpha integration and verification](design/alpha-integration.md)

## Final Project Deliverables

#### F2 Deliverables: Problem Framing
* [Domain](final-proj-deliverables/f2.md#domain)
* [Bad Situation](final-proj-deliverables/f2.md#bad-situation-two-friends-use-the-same-word-for-different-sounds)
* [Evidence](final-proj-deliverables/f2.md#evidence)
* [Workarounds and Comparables](final-proj-deliverables/f2.md#workarounds-and-comparables)
* [Solution Sketch](final-proj-deliverables/f2.md#solution-sketch)
* [Ethical Analysis](final-proj-deliverables/f2.md#ethical-analysis)
* [References](final-proj-deliverables/f2.md#references)

#### F3 Deliverables: Concept Design & Planning
* [Problem framing](final-proj-deliverables/f2.md)
* [Concept design](final-proj-deliverables/sound-it-out-f3.md#concept-design)
* [User journey](final-proj-deliverables/sound-it-out-f3.md#user-journey)
* [Visual design study](final-proj-deliverables/sound-it-out-f3.md#visual-design-study)
  * [Color palette slide](final-proj-deliverables/visual-design/colorschemeslide1-visualdesign.png)
  * [Typography palette slide](final-proj-deliverables/visual-design/typographyslide2-visualdesign.png)
* [Design summary](final-proj-deliverables/sound-it-out-f3.md#design-summary)
* [Development plan](final-proj-deliverables/sound-it-out-f3.md#development-plan)
