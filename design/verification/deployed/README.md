# Deployed verification

**App:** https://sound-it-out.mit-sdg.dev, on the course platform (6.1040 Apps), with the
platform's MongoDB.  
**Checked:** November 23, 2026, about 15:50 UTC, from a laptop on one network, in Google
Chrome through Playwright.  
**Deployed commit:** `f43cca4`, the newest commit on `main` when it was deployed; no code
has changed since. Confirm against the platform's Overview tab when redeploying.

| Check | How | Result | Output |
| --- | --- | --- | --- |
| Health | `curl https://sound-it-out.mit-sdg.dev/health` | `200 {"status":"ok"}` | [health.txt](health.txt) |
| Browser journeys A to D | `BASE_URL=https://sound-it-out.mit-sdg.dev bun run test:e2e` | **27 passed, 0 failed**; SoundCloud player ready | [browser-journeys.txt](browser-journeys.txt), [screens](screens/) |
| Catalog playback | `bun run check:tracks` | 14 of 14 tracks play | [tracks.txt](tracks.txt) |
| Session cookie | Signing in by `curl` | `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Strict`, 7-day expiry | Below |
| Origin check | Signing in with `Origin: https://evil.example` | `403` refused | Below |
| Frames | Response headers of `/` | `Content-Security-Policy: frame-src https://w.soundcloud.com` | Below |

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
  - A failed save.
  - A session ended mid-task.
  - A duplicate suggestion.
  - A request the server does not answer.
  - A word removed while someone was suggesting for it.

Both the owner and the friend reloaded their pages partway through, and everything they
had saved was still there.

## Limits

- **Two redeploys not tested.** Data survived page reloads on the live site. It has not
  been checked across a redeploy or a restart of the platform's machine.
- **Other browsers.** Signing in and playing a track in Safari and Firefox on the live
  site still needs to be done by hand, and someone needs to listen to the sound.
- **Test accounts.** The journeys created accounts named `alex-…`, `daniel-…`, and
  `sam-…` on the live site, plus one `probe…` account from the cookie check. They are
  harmless and can be left.
- **One network.** Playback was checked from one place. Region restrictions were not tested.
