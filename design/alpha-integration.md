# Alpha integration

## Accounts in the running app

F3 described setting a password for an existing identity. The implementation allocates
the user and writes its verifier in one registration action. A second action proves
the password and issues a session. That keeps registration atomic on local and hosted
MongoDB while letting the browser sign in automatically. If sign-in fails after
registration, the form keeps the username and offers sign-in again.

Use the server's `UserAuthenticating.current({ session })` in protected reactions. It
returns the user ID that should be passed as actor. Vue's account state helps render
controls. The HTTP adapter injects the session from an HttpOnly cookie and checks the
origin on routes that use it. User IDs are safe to display and carry no authority.

## Associating on the personal Sound Wall

Associating is registered, and its user is the authenticated account. The Sound Wall
lists, creates, edits, and changes visibility for the session user. A person's public
wall, addressed by username, can be opened without a session and lists only public
words; private words stay hidden. Removing a word calls
`Associating.remove` and then `Annotating.clearContext` in that request. Pitch
cleanup joins the same request when Pitching is registered. Those writes run in
order. They are not yet one database transaction.

## Connecting annotations to the Sound Wall

The [Annotating concept](concepts/Annotating.md) owns notes, roles, and visibility.
The [Examples composition](compositions/Examples.md) and the personal Wall now let
owners edit, share, unshare, and remove existing examples. The shared permission view
checks the word owner and the annotation's context before Annotating checks authorship.
The same note form accepts an empty draft for attaching a selected excerpt. Connecting
its add flow and showing track details in the Wall require Excerpting.

| Flow | Composition responsibility |
| --- | --- |
| Add an example | Resolve the session and confirm word ownership. Select the excerpt and create the annotation with the owner's ID, an explanation, and role `EXAMPLE`. |
| Edit, share, or remove | Confirm word ownership and look up the annotation in that word. Pass the verified actor to the author-checked action. Sharing an annotation takes a separate action. |
| Open a shared word | Check the word's visibility first. Return only `SHARED` annotations to visitors, including signed-in users who do not own the word. |
| Promote a pitch | Confirm word ownership and a saved `MATCH`. Create a private annotation from the selected excerpt and the owner's note. |
| Delete a word | Include `Annotating.clearContext` and pitch cleanup in the word deletion. |

F3 requires add, promotion, and deletion to preserve the cross-concept invariants
even if requests overlap. The next increment needs a transaction boundary shared by
the relevant reactions and a storage topology that supports it. Add and delete
must also serialize writes against the same word, so deletion cannot race an add
that read an earlier snapshot. Verify transaction support on the class platform.
Then exercise rollback after excerpt selection, concurrent annotation creation and
word deletion, and separate owner, signed-in visitor, and anonymous views.

## Verification in this branch

- All 19 concept and HTTP tests passed against isolated MongoDB databases. They
  create data through actions and requests and cover concurrent duplicates,
  persistence across assembly restarts, cookie-only identity, cross-origin sign-out
  refusal, and example management and visibility.
- Chrome at 390 pixels exercised registration, correction of an invalid password,
  cookie persistence on a deliberate reload, sign-out, and failed and successful
  sign-in. Registration and sign-out updated the view without navigation.
- Chrome at 390 pixels also exercised editing, sharing, unsharing, and removing an
  existing example. The isolated setup attached the example through the concept action.
  The owner managed it without navigating, and a signed-out visitor could read it only
  while both the example and its word were shared.
- Sync-engine reports fallback advisories on endpoint chains and ordering advisories
  on the Sound Wall projections. The protected example routes test successful and
  refused requests through HTTP.
- The full alpha still needs a deployed build of the integrated MVP, its public URL,
  a narrated recording of that build, and the team development plan update. On the
  class host use the root package, Bun, the `start` script, port `3000`, and `/health`.
  Set `MONGODB_URL` and `PUBLIC_ORIGIN` using the hosting settings. [Course deployment guide](https://61040.github.io/fa26/resources/deploying-apps/)
