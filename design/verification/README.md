# Verification

What was checked, how to run it again, and what each check does not show. Every row
below was run on the working tree that became the commit recorded with it.

Run on November 22, 2026, on macOS with Bun 1.4.0 (the project pins 1.4.2), MongoDB 8.0
in Docker, and Google Chrome through Playwright.

| Check | Command | Result | Output |
| --- | --- | --- | --- |
| Specification grammar | `bun run check:design` | Passed for 10 documents | [check-design.txt](check-design.txt) |
| Assembly, generated contract, types | `bun run check` | Passed; 30 engine advisories, all "no recognized total answer path" or "order-sensitive former" | [check.txt](check.txt) |
| Concept, function, and HTTP tests | `bun test` | 56 passed, 0 failed | [tests.txt](tests.txt) |
| Browser journeys | `bun run test:e2e` | 18 passed, 0 failed; SoundCloud player reported ready | [browser-journeys.txt](browser-journeys.txt), [screens](screens/) |
| Text contrast | `bun scripts/contrast.ts` | All 13 pairs pass | [contrast.md](contrast.md) |

## What the tests cover

- **Concepts** (`tests/concepts/`): each concept's principle, then every refusal, its
  normalization rules, identity across edits, visibility defaults, and races on the
  rules it owns (two adds of one song, two pitches of one song, a withdrawal against a
  review, an accept against a cancel, two people asking each other).
- **Draft description** (`tests/shared/draft.test.ts`): each sentence pattern, and
  three properties over 500 random inputs.
- **HTTP** (`tests/integration/`): the journeys with separate owner, friend,
  contributor, stranger, and signed-out callers; every refusal in the access table;
  input bounds; persistence across a restart. Setup uses requests only.
- **Privacy sweep** (`privacy.test.ts`): stores a unique marker in every private
  place, calls every route as four kinds of reader, and fails if any answer contains
  a marker that reader may not see. It fails if a route is added without being added
  to the sweep, and it first checks that the owner and a friend do receive their
  markers, so a sweep of refusals cannot pass by accident.
- **Removal race** (`removal-race.test.ts`): see [D9](../decisions.md#d9-an-add-that-loses-the-race-to-a-removal-says-so).
  The saved run reports, for songs, 59 trials that stored the song while the word
  existed and 1 that stored it after the word was gone, which was answered "word gone"
  and cleared. For suggestions, all 60 stored while the word existed. Counts vary
  between runs.
- **Browser journeys** (`tests/e2e/journeys.e2e.ts`): build a word from songs, become
  friends and suggest, and review and add a match. They include a save that fails and
  keeps the person's input, signing in partway through, the Back button, a reload of
  both people, and a signed-out stranger at phone width. A page is reloaded only where
  a step checks persistence.

## Limits of this evidence

- **Not deployed.** No public URL has been tested. The browser journeys accept
  `BASE_URL` and should be run against the deployment before it is called working:
  `BASE_URL=https://… bun run test:e2e`.
- **Playback.** The SoundCloud player reporting ready was observed from one network in
  Chrome. Region restrictions and other browsers were not tested.
- **No user sessions yet.** The F3 plan calls for at least three people outside the
  team. Nothing here substitutes for watching them.
- **Accessibility.** Keyboard use of the chips and focus movement are exercised in the
  journeys, and contrast is computed. No screen-reader pass or full audit was done.
- **Race coverage.** The race tests exercise interleavings by repetition; they do not
  force each one. The deterministic tests cover the late-write path directly.
