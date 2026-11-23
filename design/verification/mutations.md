# Mutation check

Run 2026-11-23 with `bun run check:mutations`. Each row plants one bug, runs the tests that
should notice it, and restores the code. "Caught" means at least one of those tests failed.
The unmutated tests passed first, so every failure below is caused by the planted bug.

| Planted bug | File | Tests run | Result |
| --- | --- | --- | --- |
| Visitors see songs the owner did not share | `src/compositions/SoundWall.ts` | `integration/privacy.test.ts` | caught (1 failing) |
| Everyone who visits a wall is treated as a friend | `src/compositions/SoundWall.ts` | `integration/friends.test.ts`, `integration/privacy.test.ts` | caught (2 failing) |
| Anyone can add songs to someone else's word | `src/compositions/SoundWall.ts` | `integration/sound-wall.test.ts` | caught (1 failing) |
| Suggestions are accepted for private words | `src/compositions/Suggestions.ts` | `integration/suggestions.test.ts` | caught (1 failing) |
| A suggestion can be added to examples without being marked a match | `src/compositions/Suggestions.ts` | `integration/suggestions.test.ts` | caught (1 failing) |
| Annotating lets anyone edit an annotation | `src/concepts/Annotating.ts` | `concepts/Annotating.test.ts` | caught (1 failing) |
| Pitching lets anyone review a suggestion | `src/concepts/Pitching.ts` | `concepts/Pitching.test.ts` | caught (1 failing) |
| A reviewed suggestion can still be withdrawn | `src/concepts/Pitching.ts` | `concepts/Pitching.test.ts` | caught (1 failing) |
| A friend request can be accepted when none was sent | `src/concepts/Friending.ts` | `concepts/Friending.test.ts` | caught (2 failing) |
| The draft counts qualities from counterexamples | `shared/draft.ts` | `shared/draft.test.ts` | caught (3 failing) |
| A song stored after its word was removed is not repaired | `src/compositions/SoundWall.ts` | `integration/removal-race.test.ts` | caught (1 failing) |
| An add that lost the race to a removal is reported as saved | `src/compositions/SoundWall.ts` | `integration/removal-race.test.ts` | caught (2 failing) |
| The startup sweep clears songs on words that still exist | `src/maintenance.ts` | `integration/orphans.test.ts` | caught (1 failing) |

13 of 13 planted bugs caught.
