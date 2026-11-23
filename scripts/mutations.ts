/**
 * Checks that the tests would catch the mistakes that matter most.
 *
 * Each mutation below plants one specific bug: a missing access check, a leak, a dropped repair.
 * The script applies it, runs the tests that should notice, records whether they failed, and puts
 * the code back. A mutation the tests do not catch means a test has gone weak, and the run fails.
 *
 *   bun run check:mutations            print a Markdown table
 *   bun run check:mutations --save     also write design/verification/mutations.md
 *
 * Needs MongoDB running, like `bun test`. It edits source files while it runs and always restores
 * them, even when interrupted with Ctrl+C.
 */
type Mutation = { bug: string; file: string; find: string; replace: string; tests: string[] };

const mutations: Mutation[] = [
  {
    bug: "Visitors see songs the owner did not share",
    file: "src/compositions/SoundWall.ts",
    find: `annotation, item, role, note, qualities, visibility: "SHARED",`,
    replace: `annotation, item, role, note, qualities,`,
    tests: ["tests/integration/privacy.test.ts"],
  },
  {
    bug: "Everyone who visits a wall is treated as a friend",
    file: "src/compositions/SoundWall.ts",
    find: `.then(respond({ owner: name, wall: VisibleWall({ user: owner, levels: FOR_ANYONE }) }))
        .named("not-friend"),`,
    replace: `.then(respond({ owner: name, wall: VisibleWall({ user: owner, levels: FOR_FRIENDS }) }))
        .named("not-friend"),`,
    tests: ["tests/integration/friends.test.ts", "tests/integration/privacy.test.ts"],
  },
  {
    bug: "Anyone can add songs to someone else's word",
    file: "src/compositions/SoundWall.ts",
    find: `where(Associating._get({ association }).is({ user }))
        .then(Annotating.annotate(`,
    replace: `where(Associating._get({ association }))
        .then(Annotating.annotate(`,
    tests: ["tests/integration/sound-wall.test.ts"],
  },
  {
    bug: "Suggestions are accepted for private words",
    file: "src/compositions/Suggestions.ts",
    find: `where(Associating._get({ association }).is({ user: owner, visibility: "PUBLIC" }))`,
    replace: `where(Associating._get({ association }).is({ user: owner }))`,
    tests: ["tests/integration/suggestions.test.ts"],
  },
  {
    bug: "A suggestion can be added to examples without being marked a match",
    file: "src/compositions/Suggestions.ts",
    find: `where(Pitching._get({ pitch }).is({ recipient: user, target, item, fit: "MATCH" }))`,
    replace: `where(Pitching._get({ pitch }).is({ recipient: user, target, item }))`,
    tests: ["tests/integration/suggestions.test.ts"],
  },
  {
    bug: "Annotating lets anyone edit an annotation",
    file: "src/concepts/Annotating.ts",
    find: `if (row.author !== author) throw new NotAuthor(`,
    replace: `if (false) throw new NotAuthor(`,
    tests: ["tests/concepts/Annotating.test.ts"],
  },
  {
    bug: "Pitching lets anyone review a suggestion",
    file: "src/concepts/Pitching.ts",
    find: `if (row.recipient !== recipient) throw new NotRecipient(`,
    replace: `if (false) throw new NotRecipient(`,
    tests: ["tests/concepts/Pitching.test.ts"],
  },
  {
    bug: "A reviewed suggestion can still be withdrawn",
    file: "src/concepts/Pitching.ts",
    find: `const result = await this.pitches.deleteOne({ _id: pitch, contributor, fit: "PENDING" });`,
    replace: `const result = await this.pitches.deleteOne({ _id: pitch, contributor });`,
    tests: ["tests/concepts/Pitching.test.ts"],
  },
  {
    bug: "A friend request can be accepted when none was sent",
    file: "src/concepts/Friending.ts",
    find: `if (!claimed.deletedCount) throw new NoRequest(`,
    replace: `if (false) throw new NoRequest(`,
    tests: ["tests/concepts/Friending.test.ts"],
  },
  {
    bug: "The draft counts qualities from counterexamples",
    file: "shared/draft.ts",
    find: `example.role === "EXAMPLE" && example.qualities.length > 0`,
    replace: `example.qualities.length > 0`,
    tests: ["tests/shared/draft.test.ts"],
  },
  {
    bug: "A song stored after its word was removed is not repaired",
    file: "src/compositions/SoundWall.ts",
    find: `RemoveExample, ClearExamplesOfMissingWord },`,
    replace: `RemoveExample },`,
    tests: ["tests/integration/removal-race.test.ts"],
  },
  {
    bug: "An add that lost the race to a removal is reported as saved",
    file: "src/compositions/SoundWall.ts",
    find: `.then(respond({ annotation, word: WordAfterWrite({ association }) }))`,
    replace: `.then(respond({ annotation }))`,
    tests: ["tests/integration/removal-race.test.ts"],
  },
  {
    bug: "The startup sweep clears songs on words that still exist",
    file: "src/maintenance.ts",
    find: `if (!await missing(context)) continue;`,
    replace: `if (await missing(context)) continue;`,
    tests: ["tests/integration/orphans.test.ts"],
  },
];

const root = new URL("..", import.meta.url).pathname;
const originals = new Map<string, string>();

function restoreAll() {
  for (const [file, text] of originals) Bun.write(`${root}${file}`, text);
}
process.on("SIGINT", () => { restoreAll(); process.exit(130); });

async function run(tests: string[]) {
  const child = Bun.spawn(["bun", "test", "--timeout", "15000", ...tests], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const output = (await new Response(child.stderr).text()) + (await new Response(child.stdout).text());
  await child.exited;
  const failed = Number(output.match(/(\d+) fail/)?.[1] ?? 0);
  return { exit: child.exitCode, failed };
}

const baseline = await run([...new Set(mutations.flatMap(mutation => mutation.tests))]);
if (baseline.exit !== 0) {
  console.error("The tests fail without any mutation. Fix them before checking mutations.");
  process.exit(1);
}

const rows: string[] = [];
let missed = 0;
try {
  for (const mutation of mutations) {
    const path = `${root}${mutation.file}`;
    const text = originals.get(mutation.file) ?? await Bun.file(path).text();
    originals.set(mutation.file, text);
    const occurrences = text.split(mutation.find).length - 1;
    if (occurrences !== 1) {
      throw new Error(`Mutation "${mutation.bug}" expects its target exactly once in ${mutation.file}; found ${occurrences}. Update scripts/mutations.ts.`);
    }
    await Bun.write(path, text.replace(mutation.find, mutation.replace));
    const result = await run(mutation.tests);
    await Bun.write(path, text);
    const caught = result.exit !== 0;
    if (!caught) missed += 1;
    rows.push(`| ${mutation.bug} | \`${mutation.file}\` | ${mutation.tests.map(test => `\`${test.replace("tests/", "")}\``).join(", ")} | ${caught ? `caught (${result.failed} failing)` : "**MISSED**"} |`);
    console.log(rows.at(-1));
  }
} finally {
  restoreAll();
}

const report = [
  "# Mutation check",
  "",
  `Run ${new Date().toISOString().slice(0, 10)} with \`bun run check:mutations\`. Each row plants one bug, runs the tests that`,
  "should notice it, and restores the code. \"Caught\" means at least one of those tests failed.",
  "The unmutated tests passed first, so every failure below is caused by the planted bug.",
  "",
  "| Planted bug | File | Tests run | Result |",
  "| --- | --- | --- | --- |",
  ...rows,
  "",
  `${mutations.length - missed} of ${mutations.length} planted bugs caught.`,
  "",
].join("\n");

if (process.argv.includes("--save")) await Bun.write(`${root}design/verification/mutations.md`, report);
console.log(`\n${mutations.length - missed} of ${mutations.length} planted bugs caught.`);
if (missed) process.exitCode = 1;
