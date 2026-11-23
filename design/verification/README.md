# Verification

What was checked, how to run it again, and what each check does not show.

**Deployed app:** checked on November 23, 2026, at https://sound-it-out.mit-sdg.dev with
the full browser journeys: **27 passed, 0 failed**, and all 14 tracks play. Details and
limits are in [deployed/](deployed/README.md).  
**Local runs:** commit `7c7c96c`, on November 23, 2026, on macOS with Bun 1.4.0 (the
project pins 1.4.2), MongoDB 8.0 in Docker, and Google Chrome through Playwright.

## Two failures, diagnosed and fixed

| Failure | Diagnosis | Correction | How a recurrence is caught |
| --- | --- | --- | --- |
| A song was reported as added to a word that had just been removed | A race between two requests; reproduced on demand by removing the word at the moment the song is written | Writes into a word answer with the word as read afterward; a repair reaction and a startup sweep clear the leftover | A forced-race test that fails on the old code ([case study](case-study/README.md)) |
| A ready player once stalled for 24 s | Not reproducible in 12 replays (sound after 1.1 to 1.4 s); once in about 55 plays; a passing network delay | The player says "Not playing?" and links to SoundCloud after 8 s of silence | Journey D blocks the audio host and checks the hint; `check:tracks` times every track ([tracks](tracks.md), [D12](../decisions.md#d12-a-player-that-stalls-says-so)) |

## Would the tests catch a real mistake?

`bun run check:mutations` plants 13 specific bugs one at a time and runs the tests that
should notice each: a missing access check, a leak of unshared songs, a missing match
check, a dropped repair, a reversed sweep, and others. **All 13 are caught**
([mutations](mutations.md)). The check fails whenever a planted bug goes unnoticed, so a
test that weakens later is found.

## Deployed app

| Check | Command | Result | Output |
| --- | --- | --- | --- |
| Health | `curl https://sound-it-out.mit-sdg.dev/health` | `200 {"status":"ok"}` | [deployed/health.txt](deployed/health.txt) |
| Browser journeys A to D, four sessions | `BASE_URL=https://sound-it-out.mit-sdg.dev bun run test:e2e` | 27 passed, 0 failed; SoundCloud player ready | [deployed/browser-journeys.txt](deployed/browser-journeys.txt), [screens](deployed/screens/) |
| Catalog playback | `bun run check:tracks` | 14 of 14 play | [deployed/tracks.txt](deployed/tracks.txt) |
| Cookie, origin, and frame rules | `curl` against the live site | `__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict`; sign-in from another origin refused with `403`; frames limited to SoundCloud | [deployed/README.md](deployed/README.md) |

The deployed commit is `f43cca4`, the newest on `main` when the team deployed; no code
has changed since. The platform's deployment identifier
(`7d1a11fe-875a-4a60-8c88-a6726745df6a`) is not a Git commit. Before these automated
runs, the team also walked through a two-person journey on the deployment by hand; its
steps were not recorded.

## Local runs

| Check | Command | Result | Output |
| --- | --- | --- | --- |
| Specification grammar | `bun run check:design` | Passed for 10 documents | [check-design.txt](check-design.txt) |
| Assembly, generated contract, types, reviewed advisories | `bun run check` | Passed; all 30 engine advisories reviewed | [check.txt](check.txt), [advisories](advisories.md) |
| Concept, draft, and HTTP tests | `bun test` | 60 passed, 0 failed | [tests.txt](tests.txt) |
| Planted bugs caught | `bun run check:mutations` | 13 of 13 | [mutations.md](mutations.md) |
| Browser journeys A to D | `bun run test:e2e` | 28 passed, 0 failed | [browser-journeys.txt](browser-journeys.txt), [screens](screens/) |
| Catalog playback | `bun run check:tracks` | 14 of 14, with time to ready and to sound; one earlier stall diagnosed | [tracks.md](tracks.md) |
| Text contrast | `bun scripts/contrast.ts` | All 13 pairs pass | [contrast.md](contrast.md) |

## Follow-up on the merged alpha

On November 22, the merged music-first build (`ea11c8c`) passed 60 local concept and
HTTP tests. The follow-up with the sharing fixes passed 27 browser checks in Chrome,
including a real SoundCloud player reporting ready. The new checks verified that a
private note survives editing and reload, a failed attempt to hide a song restores
its checkbox, and a signed-out visitor cannot see a song when switching a public
word to friends fails. The two failure cases both reproduced before their fixes.
[Sharing decisions](../decisions.md#d5-one-share-panel-over-two-stored-facts-changed-in-fail-closed-order)

## One defect, end to end

[Case study](case-study/README.md): a song reported as added to a word that no longer
existed. It goes from the race test that exposed it, through the fix, to a forced
regression test, with saved runs of that test failing on the old code and passing on
the new. It also records that the first version of the regression test could not fail,
and how that was discovered and corrected.

## What the tests cover

- **Concepts** (`tests/concepts/`): each concept's principle, every refusal,
  normalization, identity across edits, visibility defaults, and races on the rules it
  owns: two adds of one song, two pitches of one song, a withdrawal against a review,
  an accept against a cancel, and two people asking each other.
- **Draft description** (`tests/shared/draft.test.ts`): each sentence pattern, and
  three properties over 500 random inputs.
- **HTTP** (`tests/integration/`): the journeys with separate owner, friend,
  contributor, stranger, and signed-out callers; every refusal in the access table;
  input bounds; persistence across a restart. Setup uses requests only.
- **Privacy sweep** (`privacy.test.ts`): stores a unique marker in every private place,
  calls every route as four kinds of reader, and fails if an answer contains a marker
  that reader may not see. It fails if a route is added without being added to the
  sweep. It first checks that the owner and a friend do receive their markers, so a
  sweep of refusals cannot pass by accident.
- **Removal race** (`removal-race.test.ts`): a forced test that removes the word at
  the moment a song is written; two deterministic tests of the repair; and two race
  tests of 60 trials each. The race tests print how many trials took each path. In
  this run all 60 stored the song while the word still existed. An earlier run caught
  the late write once; the forced test covers that case on every run.
- **Failed repair** (`orphans.test.ts`): reproduces what a faulted repair leaves and
  checks that the startup sweep clears exactly that.
- **Guards under changing state** (`guard-race.test.ts`): 400 suggestions while the
  word flips between public and private on every one, and 100 wall visits while a
  friendship is made and ended. In this run, 0 of 500 requests went unanswered and
  none was answered wrongly ([advisories](advisories.md#missing_endpoint_fallback-26-warnings-one-per-endpoint-path)).
- **Browser journeys** (`tests/e2e/journeys.e2e.ts`):
  - A: build a word from songs.
  - B: become friends and suggest a song.
  - C: review a suggestion and add a match.
  - D: recover from a track that will not load, a failed save, a session that ends
    mid-task, a duplicate suggestion, a request the server never answers, and a word
    removed while someone is using it.
  - A page is reloaded only where a step checks persistence.

## Limits of this evidence

- **Deployed evidence is one run.** The deployed journeys passed once, from one
  network, in Chrome. Re-run them after every deployment. Run
  `BASE_URL=https://sound-it-out.mit-sdg.dev bun run test:e2e`, and save its output
  with the date and deployed commit. Those journeys create accounts and content on
  the deployed app.
- **Restart on the host.** Persistence across a restart is tested locally (HTTP tests
  reassemble the app over the same database; the browser journeys reload both people).
  It has not been tested across a redeploy.
- **Playback.** The check confirms that each track is ready, not blocked, and advancing
  in Chrome from one network. It does not show that a person can hear it, that it plays
  in Safari or Firefox, or that it plays in other regions. One run had a track stall.
- **User observation.** The reported two-person journey involved team members; its
  observations have not yet been recorded. Understanding the audiences, finding Friends, and adding a match
  should be checked by watching people use the app
  ([plan](../../final-proj-deliverables/f4-development-plan.md#43-sessions-with-people-before-the-beta)).
- **Accessibility.** Keyboard use of the chips, focus movement after errors, and
  contrast are checked. No screen-reader pass or full audit was done.
