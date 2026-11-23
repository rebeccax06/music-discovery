# Case study: a song reported as added to a word that no longer existed

This traces one consequential defect from the evidence that exposed it, through the
diagnosis and fix, to the regression test that now guards it. It also records a mistake
in that test, which the test's own failure revealed.

## 1. The risk

Removing a word runs three actions in order: remove the word, clear its songs, clear
its suggestions. Adding a song checks that the word belongs to the person and then
writes. The engine commits each action separately and offers no transaction across
them ([D3](../../decisions.md#d3-no-cross-concept-transactions)). So an add can pass
its check, then the owner removes the word, then the song is written.

A routine test cannot see this. Each request on its own is correct; only one ordering
of two requests misbehaves.

## 2. Evidence of the failure

The race test (`tests/integration/removal-race.test.ts`) runs add and remove together
60 times and then checks that nothing refers to the removed word. Storage was always
clean: the repair reaction cleared any late write. But the answers told a different
story. An add could be answered `200` with a new song identity even though the word
had already been removed and the song was about to be cleared. **The person was told
the song was added when it was not kept.**

Because the race tests reach that ordering only by chance (once in 60 trials in the
saved run), a deterministic test was needed to prove the fix and keep it fixed.

## 3. Diagnosis and fix

Two fixes were considered:

- **Answer `WORD_NOT_FOUND` from a branch after the write.** The engine rejects this
  ("a branch-local then(...) takes one callable action line"), because the ownership
  check is already a branch.
- **Report the word as read after the write.** Chosen. Every endpoint that writes into
  a word (adding a song, sending a suggestion, adding a match) answers with
  `word: { label }` from a read-only former evaluated at answer time. A removed word
  reads as `{ label: null }`, and the interface says "This word was just removed, so
  the song was not kept."
  See [D9](../../decisions.md#d9-an-add-that-loses-the-race-to-a-removal-says-so).

## 4. A regression test that could not fail, and how that was found

The first version of the deterministic test replaced `Annotating.annotate` on the
concept instance with a version that removed the word before writing. Run against the
fix, it **failed**: the answer still named the word.

That looked like the fix was wrong. Turning off the engine's query memoization changed
nothing, which ruled out a stale cached read. A timing trace then showed that the
replacement method was never called. The engine binds concept methods when the app is
assembled, and it recognizes them by function name. Patching an instance afterward has
no effect, so the test never removed the word at all. It would have passed or failed
regardless of the code.

The test helper now applies such replacements before assembly, under the original
method name (`around()` and `restart(adjust)` in [tests/support/http.ts](../../../tests/support/http.ts)).
The test also asserts that the forced ordering happened (`expect(forced).toBe(true)`),
so it cannot pass without exercising the race.

## 5. Before and after

The same test run against the code before the fix and with the fix:

| Code | Result | Output |
| --- | --- | --- |
| Add answers `respond({ annotation })` (before) | **Fails**: `word` is `undefined`; the add looks like an ordinary success | [before-fix.txt](before-fix.txt) |
| Add answers `respond({ annotation, word: WordAfterWrite({ association }) })` (after) | Passes: `word` is `{ label: null }` | [after-fix.txt](after-fix.txt) |

## 6. Recovery if the repair itself fails

The repair reaction clears a late write. If it faulted, the row would stay in storage,
unreachable because every read starts from a word that exists. To make that state
detectable and recoverable rather than only argued about, the server now sweeps on
every start (`src/maintenance.ts`). It lists contexts and targets through Annotating's
and Pitching's own queries, asks Associating whether each word exists, and clears the
rest through the concepts' own actions. It logs a warning with what it cleared.
`tests/integration/orphans.test.ts` creates exactly the state a failed repair leaves,
and asserts that the sweep clears it, touches nothing else, and finds nothing on a
second run.

## 7. Keeping it fixed

- The forced-race test runs in `bun test` on every change.
- The two race tests keep running, and report how many trials took each path.
- The orphan sweep runs at every server start, and its test runs in `bun test`.
