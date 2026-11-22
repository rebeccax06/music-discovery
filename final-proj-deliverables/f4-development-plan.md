# Sound It Out F4 Development Plan

**Progress as of November 22, 2026**

The alpha centers on one exchange. A listener defines a word, attaches a real song
interval with an explanation, and shares it so a friend can understand what the word
means to them. The F3 plan also calls for a friend to propose an excerpt and the
owner to review it privately. [F3 development plan](sound-it-out-f3.md#development-plan)

## Progress since F3

- **Accounts and Sound Wall.** Sign-up, sign-in, and sign-out work. Owners can create,
  edit, remove, and publish words. Anyone with a public Wall address can open its
  public words. The app uses a username-based Wall address. [Sound Wall design](../design/compositions/SoundWall.md)
- **Example management.** The local integration build lets owners edit, share, make
  private, and remove existing examples. The Wall shows an example to visitors only
  when the word is public and the example is shared. These management controls came forward
  from the F3 beta plan. Attaching a new interval from the Wall is the priority for
  alpha integration. [Examples design](../design/compositions/Examples.md)
- **Excerpt selection and pitches.** The Wall still needs an integrated track picker,
  interval selection and storage, and track details. The Pitching concept has an
  implementation on a separate branch. Submission and private review still need
  integration with the running app.

## November 23 Alpha

1. Connect the track picker and note form to the word’s **Add example** flow. Save the
   interval with the explanation, then show the track and timestamps on both Wall
   views. Start with a small set of verified tracks. Where embedded playback cannot
   start at the selected interval, present the timestamps and a link to the track.
2. Connect signed-in pitch submission and owner-only review. Keep review responses
   private by default. Integrate pitch promotion after submission and review are
   working reliably.
3. Verify the integrated journey with an owner, a signed-in friend, and a signed-out
   visitor. Check that examples persist after reload, that private content stays
   private, and that another account cannot change the owner’s work. Exercise rollback
   on a refused attachment and verify cleanup when a word is removed. Record any
   remaining behavior gaps when reporting the submitted build.
4. Deploy the integration build and repeat the core journey at the public URL. Record
   and narrate the submitted build, link the recording in the README, and submit the
   commit, public URL, and video link in Commons. [F4 instructions](https://61040.github.io/fa26/assignments/f4/)

The local build passed 19 concept and HTTP tests. Chrome verified word creation and
public viewing. It also verified editing and sharing an existing example using an
isolated example created through a concept action. The next browser run starts with
a real track selection. [Verification notes](../design/alpha-integration.md#verification-in-this-branch)

## Beta and final milestones

- **November 30, beta.** Run the first sessions with outside users once the integrated
  flow is ready. Use their feedback to improve excerpt playback and pitch review.
  Complete promotion, test duplicate proposals and promotion, and verify that removing
  a word clears its examples and pitches even when requests overlap.
- **December 7, user testing.** Observe participants defining a word, sharing an
  example, and responding to a friend’s pitch. Record where they hesitate, what they
  misunderstand, and whether the recipient can explain the definition in their own words.
- **December 9, final demo and report.** Fix the highest-impact findings, rerun the
  privacy and keyboard checks, and document what the testing showed. [Course milestones](https://61040.github.io/fa26/assignments/final-project/#due-dates)
