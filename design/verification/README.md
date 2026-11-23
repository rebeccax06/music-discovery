# Verification

What was checked, how to run it again, and what each check does not show.

**Code checked:** commit `1c71a5f`. The outputs in this folder were produced from that
commit and committed afterward.  
**Run on:** November 22, 2026, on macOS, with Bun 1.4.0 (the project pins 1.4.2),
MongoDB 8.0 in Docker, and Google Chrome through Playwright. **Not run against a
deployment**; see [limits](#limits-of-this-evidence).

| Check | Command | Result | Output |
| --- | --- | --- | --- |
| Specification grammar | `bun run check:design` | Passed for 10 documents | [check-design.txt](check-design.txt) |
| Assembly, generated contract, types, reviewed advisories | `bun run check` | Passed; all 30 engine advisories reviewed | [check.txt](check.txt), [advisories](advisories.md) |
| Concept, draft, and HTTP tests | `bun test` | 60 passed, 0 failed | [tests.txt](tests.txt) |
| Browser journeys A to D | `bun run test:e2e` | 23 passed, 0 failed | [browser-journeys.txt](browser-journeys.txt), [screens](screens/) |
| Catalog playback | `bun run check:tracks` | 14 of 14 played on `bb09f35` and again on `1c71a5f`; one earlier run had 13 of 14 | [tracks.md](tracks.md) |
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

- **Not deployed.** Nothing here shows the public app works. After deploying, run
  `BASE_URL=https://<app>.mit-sdg.dev bun run test:e2e`, and save its output here with
  the date and deployed commit. The journeys then cover owner, friend, stranger, and
  signed-out sessions on the real host.
- **Restart on the host.** Persistence across a restart is tested locally (HTTP tests
  reassemble the app over the same database; the browser journeys reload both people).
  It has not been tested across a redeploy.
- **Playback.** The check confirms that each track is ready, not blocked, and advancing
  in Chrome from one network. It does not show that a person can hear it, that it plays
  in Safari or Firefox, or that it plays in other regions. One run had a track stall.
- **No sessions with people yet.** Whether people understand the three audiences, find
  the Friends page, and see that a match is not added until they add it can only come
  from watching them ([plan](../../final-proj-deliverables/f4-development-plan.md#43-sessions-with-people-before-the-beta)).
- **Accessibility.** Keyboard use of the chips, focus movement after errors, and
  contrast are checked. No screen-reader pass or full audit was done.
