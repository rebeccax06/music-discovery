# Deployed verification

**App:** https://sound-it-out.mit-sdg.dev, on the course platform (6.1040 Apps), with the
platform's MongoDB.  
**Deployed commit:** `1dbe55a`, the newest commit on `main`; its code is identical to
`7c7c96c`. The live script was confirmed to contain the stall message added in
`7c7c96c`, so the new build, not the previous one, was the one checked.  
**Checked:** November 23, 2026, at 16:45 UTC, from a laptop on one network, in Google
Chrome through Playwright.

| Check | How | Result | Output |
| --- | --- | --- | --- |
| Health | `curl https://sound-it-out.mit-sdg.dev/health` | `200 {"status":"ok"}` | [health.txt](health.txt) |
| Browser journeys A to D | `BASE_URL=https://sound-it-out.mit-sdg.dev bun run test:e2e` | **28 passed, 0 failed**; SoundCloud player ready and playing | [browser-journeys.txt](browser-journeys.txt), [screens](screens/) |
| Catalog playback | `bun run check:tracks` | 14 of 14 tracks play | [tracks.txt](tracks.txt) |
| Session cookie | Signing in by `curl` | `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Strict`, 7-day expiry | — |
| Origin check | Signing in with `Origin: https://evil.example` | `403` refused | — |
| Frames | Response headers of `/` | `Content-Security-Policy: frame-src https://w.soundcloud.com` | — |
| Data survives a redeploy | Signing in as an account made before the redeploy | `200`; its wall loads | — |

The previous deployment, `f43cca4`, also passed its 27 browser-journey steps and 14 of
14 tracks earlier the same day. Those results are in this folder's history.

## What the browser journeys covered on the live site

Four separate browser sessions, against the real database:

- **Owner, desktop.** Picked a word, added songs with qualities, and watched the draft
  change. Shared the word with friends, wrote a description, reviewed a suggestion,
  added the match, made the word public, ended a friendship, and removed the word.
- **Friend, phone width.** Was refused the friends' word while not a friend. Signed in on
  the wall, asked to be friends, found the word on the Friends page, and suggested
  songs. Withdrew one, and saw the other reviewed without seeing the review.
- **Stranger, phone width, signed out.** Opened the public word and saw only the shared
  song.
- **Recovery.**
  - A track that will not load.
  - A track that loads but makes no sound.
  - A failed save.
  - A session ended mid-task.
  - A duplicate suggestion.
  - A request the server does not answer.
  - A word removed while someone was suggesting for it.

Both the owner and the friend reloaded their pages partway through, and everything they
had saved was still there.

## The recording

[f4 sound it out](https://youtu.be/KxDq6lYIB6s), 82 seconds, on YouTube as an unlisted
video. On November 23 it was confirmed to play for someone who is not signed in. The
video was committed to the repository on November 22 at 20:47 (`fd07f04`), so it shows
the build of that evening. Since then, two code changes reach the interface, and both
affect only failure cases:

- `38ecbd6`: a song's checkbox goes back to its saved state when a sharing change fails.
- `7c7c96c`: a player that stays silent says "Not playing?"

The journey a person follows when nothing goes wrong is the same in the recording and
in the deployed version.

## Limits

- **Restarts.** Data survives page reloads and a redeploy. The test account
  `alex-36e349`, created by the first deployed run on `f43cca4`, still signed in (`200`)
  after the redeploy to `1dbe55a`, and its wall still loads. Its words were removed by
  that run itself. A restart of the platform's machine without a redeploy was not
  tested separately.
- **Other browsers.** Signing in and playing a track in Safari and Firefox on the live
  site still needs to be done by hand, and someone needs to listen to the sound.
- **Test accounts.** The journeys created accounts named `alex-…`, `daniel-…`, and
  `sam-…`, plus `probe…` accounts from the cookie check. They are harmless.
- **One network.** Playback was checked from one place. Region restrictions were not tested.
