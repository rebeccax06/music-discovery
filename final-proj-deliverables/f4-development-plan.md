# Sound It Out F4 development plan

**Updated:** November 23, 2026, after deployment of the music-first build.

**Replaces:** the forward-looking plan in [F3](sound-it-out-f3.md#development-plan),
which is kept unchanged as the submitted record, and the earlier draft of this file
(commit `92f420e`), which planned excerpt intervals before the music-first build.  
**Team:** Bhadra Rupesh, Sanskriti Singh, Rebecca Xiong, and Victor.

This plan states what is complete, what remains, and why the scope changed. The
reasons behind each change, and how each was checked, are in the
[decision log](../design/decisions.md). Saved results are in
[verification](../design/verification/README.md).

## 1. Status at a glance

| Area | F3 planned | Status | Evidence |
| --- | --- | --- | --- |
| Accounts and sessions | Yes | **Done** | Concept and HTTP tests; browser journeys |
| Words (Associating) | Required description | **Done, changed:** description optional, three audiences | [D1](../design/decisions.md#d1-the-draft-description-is-computed-never-stored), [D8](../design/decisions.md#d8-friends-and-a-third-audience-for-a-word) |
| Songs in a word (Annotating) | Excerpt with required note | **Done for whole tracks:** add a catalog song, pick qualities, edit its optional note, choose whether to share it, and remove it | [Sound Wall design](../design/compositions/SoundWall.md#examples), [D2](../design/decisions.md#d2-qualities-belong-to-the-annotation), [D4](../design/decisions.md#d4-whole-tracks-now-excerpting-later) |
| Music playback | Curated SoundCloud library | **Done:** 14 checked tracks, SoundCloud's player | Browser journey reports the player ready |
| Description | Written by the owner | **Done, changed:** draft computed from picks; owner may write their own | [D1](../design/decisions.md#d1-the-draft-description-is-computed-never-stored) |
| Suggestions and private review (Pitching) | Yes | **Done** | Suggestion HTTP tests; Journey C |
| Adding a match to examples | Yes | **Done**; promoting twice adds once | HTTP race test |
| Friends (Friending) | Not planned | **Added** | [D8](../design/decisions.md#d8-friends-and-a-third-audience-for-a-word); friends tests; Journey B |
| Privacy across every route | Planned as tests | **Done** | Privacy sweep over every route for four readers |
| Deleting a word cleans up | Planned as a transaction | **Done, changed:** owner constraints, a repair reaction, a startup sweep, and an honest answer after a race | [D3](../design/decisions.md#d3-no-cross-concept-transactions), [D9](../design/decisions.md#d9-an-add-that-loses-the-race-to-a-removal-says-so), [case study](../design/verification/case-study/README.md) |
| Recovery from errors | Planned | **Done:** broken playback, failed save or sharing change, ended session, duplicate, removed word | [Sharing checks](../design/decisions.md#d5-one-share-panel-over-two-stored-facts-changed-in-fail-closed-order), [session recovery](../design/decisions.md#d11-recovering-from-an-ended-session-keeps-the-persons-place) |
| Every track plays | Planned | **Done** in Chrome locally; re-check before each milestone | [tracks](../design/verification/tracks.md) |
| Excerpts (Excerpting) | Yes | **Deferred** | See §3 |
| Counterexamples in the interface | Beta | **Deferred** (the concept supports them) | See §3 |
| Sharing a review with its contributor | Beta | **Deferred** | See §3 |
| Public deployment | Alpha | **Done and checked:** 27 of 27 browser-journey steps and 14 of 14 tracks against the live site, November 23 | [Sound It Out](https://sound-it-out.mit-sdg.dev/), [deployed checks](../design/verification/deployed/README.md) |
| Narrated recording | Alpha | **Recorded.** Verify the demonstrated flow on the deployed build. | [Alpha recording](../videos/f4-video.mov) |
| Sessions with people | Alpha and beta | **Two team members tested the journey**; observations and outside-user sessions remain, §4.3 | [Verification](../design/verification/README.md#deployed-app) |

## 2. Why the scope changed

1. **Music first.** Writing a definition before adding songs was the hardest step and
   the least reliable evidence of what someone hears. Picking qualities is easier,
   and the draft shows the person what their picks say.
2. **Whole tracks.** Exact start and stop in SoundCloud's embedded player is
   unverified. Every concept that refers to a song treats it as opaque, so excerpts
   can be added later without changing them.
3. **Friends.** The product is about friends explaining their words to each other,
   but the F3 design offered only "private" or "anyone with the link." A friends
   audience makes sharing safe, and the Friends page gives people somewhere to find
   words to suggest for.
4. **No cross-concept transactions.** The sync engine does not provide them. Each rule
   that must not race lives in the concept that owns it; the one cross-concept
   relation is repaired and documented.

## 3. Deferred, and the condition for picking each up

| Deferred | Pick up when | What is already in place |
| --- | --- | --- |
| Excerpts | A prototype shows the widget starting and stopping reliably in Chrome, Safari, and Firefox | Annotating and Pitching already accept opaque item identities. Excerpting can own intervals and supply those identities through [application bindings](../design/types.md). The picker and player will need interval support. |
| Counterexamples in the interface | Sessions show people want to say what a word is *not* | Annotating stores the role; the example card shows it |
| Sharing a review with the contributor | Sessions show contributors want feedback and owners are willing to give it | Reviews are private by design; this would add a shared flag to Pitching |
| SoundCloud search | The team has API credentials (an Artist Pro subscription is required to register) | The catalog is the only module that knows where tracks come from |
| Rewording the draft with a model | A small evaluation shows it is faithful to the picks, and a host is available | The draft has one function and one caller |

## 4. Remaining work

### 4.1 Deployment and verification

Owner: Sanskriti. Reviewer: Rebecca. The course platform is 6.1040 Apps at
`mit-sdg.dev` ([course guide](https://61040.github.io/fa26/resources/deploying-apps/)).
The app is deployed at [sound-it-out.mit-sdg.dev](https://sound-it-out.mit-sdg.dev/).
It runs commit `f43cca4`. On November 23 the full browser journeys (27 of 27) and the
playback check (14 of 14) passed against it; results are in
[deployed checks](../design/verification/deployed/README.md). The steps below are kept for
redeploying, and every redeploy should repeat step 6.

1. Select the final integrated commit on the team's GitHub `main`. The music-first
   build and F4 deliverables index are already merged.
2. Create the app and open **Settings**:
   - Use the team repository URL and branch `main`.
   - **Runtime:** Bun. **Package directories:** `.` only. The server builds the
     front end when it starts, so there is no `frontend` directory.
   - **Build script:** leave empty. **Start script:** `start`.
   - **Port:** `3000`. **Health check path:** `/health`.
3. **Databases and storage → Add MongoDB.** Name the variable `MONGODB_URL`;
   `MONGODB_URI` also works. Wait until it stops showing "Setting up."
4. **Environment variables:** add `PUBLIC_ORIGIN` set to the app's exact address, for
   example `https://sound-it-out.mit-sdg.dev`. Do not add `PORT`, `HOST`, or
   `NODE_ENV`; the platform sets them.
5. **Deploy tab:** choose the commit from step 1, review, and deploy. Allow 10 to 20
   minutes. Overview should show "Healthy" and the commit.
6. Check it:
   - `BASE_URL=https://<app>.mit-sdg.dev bun run test:e2e` from a laptop with the
     project installed. The browser journeys create test accounts and content on that app.
   - `bun run check:tracks` to confirm every track still plays.
   - Sign in by hand in Safari and Firefox; play one track in each and listen.
   - Save the output in `design/verification/` with the date and deployed commit,
     and update the table at the top of its README.

**If something fails.** "Exited with code 1": a missing variable; the log names it.
"Signing in gets FORBIDDEN": `PUBLIC_ORIGIN` does not exactly match the address.
"Didn't pass the health check": the database is still setting up, or the connection
variable is missing.

### 4.2 Check the demo recording (after 4.1)

The alpha recording is linked from the README. Replay the demonstrated steps on the
deployed app and update any segment if the visible behavior changed. The demo can
use two browser windows to show both the owner and the visitor experience.

1. Introduce the team and the problem in one sentence: two friends use the same word
   for different sounds.
2. Alex picks "Dreamy," adds two songs, and taps qualities; the draft appears and
   changes.
3. Alex shares Dreamy with friends and shows what friends will see.
4. Daniel opens the link, signs in on the wall, and sends a friend request; Alex
   accepts.
5. Daniel finds Dreamy on the Friends page and suggests a song with a note.
6. Alex reviews it as a match, privately, and adds it to the examples.
7. One error case: Daniel tries to suggest a song that is already on the word.
8. Say what is limited: a 14-track checked library, whole tracks, and descriptions
   built from picks, not from listening to the audio.

Add the verified deployed URL to the README, then submit the deployed commit, public
URL, and recording link in Commons.

### 4.3 Sessions with people (before the beta)

Owner: Bhadra; every team member observes one session. At least three people outside
the team, in pairs where possible, as the F3 validation plan describes.

| Step | Creator's task | Friend's task |
| --- | --- | --- |
| 1 | "Show a friend what *hype* means to you." | — |
| 2 | — | "Find your friend's word and suggest a song that fits." |
| 3 | "Decide whether their song fits." | "Say in your own words what *hype* means to your friend." |

Do not coach. For each person record: completed or not, time, every hesitation or
wrong turn and where it happened, and whether the friend's restatement matches what
the creator meant. Ask afterward whether this was clearer than their usual chat.
Record observations in `design/user-testing.md`, then file each problem as a change
with its priority. Get consent before recording anything personal.

Watch whether people understand the three audiences, realize a shared song includes
its note and picked qualities, and find the Friends page. Check whether the draft
description helps and whether reviewers understand that adding a match takes a
separate action.

### 4.4 Beta (November 30)

- Fix the highest-priority problems from 4.3, and retest them with at least one new
  person.
- Reconsider the deferred items in §3 against what the sessions showed.
- Repeat the deployed check after every deployment.

### 4.5 Final (December 7 and 9)

- Second round of sessions; keyboard-only and screen-reader passes; check that each
  catalog track still plays and update its date.
- Final recording, README, and decision log.

## 5. Risks now

| Risk | Likelihood | What we do |
| --- | --- | --- |
| A catalog track stops playing or becomes region-blocked | Medium | Each card offers the SoundCloud page; re-check tracks before each milestone |
| The deployed app behaves differently from local | Medium | Run the browser journeys against the deployed URL, not just locally |
| People do not understand "friends" versus "anyone with the link" | Medium | Watch for it in sessions; the Share panel already shows both views |
| The 14-track library feels too small to suggest from | High | Expected for the alpha; grow the checked list, or add search if credentials appear |
| The hosted database's 10-connection limit during deploys | Low | The server uses at most 5 connections |
