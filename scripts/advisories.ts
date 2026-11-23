/**
 * Fails when the sync-engine checker reports an advisory that has not been reviewed.
 *
 * Every advisory the checker currently reports is listed in design/verification/advisories.json
 * and explained in design/verification/advisories.md. A new reaction that adds an advisory fails
 * this check until someone reads it, decides whether it is a real gap, and records the decision.
 *
 *   bun scripts/advisories.ts           check
 *   bun scripts/advisories.ts --update  rewrite the list after reviewing a change
 */
type Advisory = { code: string; message: string };

const checker = Bun.spawnSync(["./node_modules/.bin/sync-engine", "check", "--format", "json"], { stderr: "pipe" });
const report = JSON.parse(checker.stdout.toString()) as { status: string; diagnostics: Array<Advisory & { severity: string }> };
if (report.status !== "passed" && report.status !== "ok" && checker.exitCode !== 0) {
  console.error("The sync-engine check itself failed; run `bunx sync-engine check` to see why.");
  process.exit(1);
}

const key = (advisory: Advisory) => `${advisory.code}: ${advisory.message}`;
const current = report.diagnostics
  .filter(diagnostic => diagnostic.severity !== "error")
  .map(({ code, message }) => ({ code, message }))
  .sort((a, b) => key(a).localeCompare(key(b)));
const listFile = new URL("../design/verification/advisories.json", import.meta.url);

if (process.argv.includes("--update")) {
  await Bun.write(listFile, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`Recorded ${current.length} advisories. Explain any new ones in design/verification/advisories.md.`);
  process.exit(0);
}

const reviewed = new Set((await Bun.file(listFile).json() as Advisory[]).map(key));
const unreviewed = current.filter(advisory => !reviewed.has(key(advisory)));
const resolved = [...reviewed].filter(entry => !current.some(advisory => key(advisory) === entry));

for (const advisory of unreviewed) console.error(`Unreviewed advisory: ${key(advisory)}`);
for (const entry of resolved) console.error(`No longer reported (remove it from the list): ${entry}`);
if (unreviewed.length || resolved.length) {
  console.error("Review each advisory, explain it in design/verification/advisories.md, then run `bun scripts/advisories.ts --update`.");
  process.exit(1);
}
console.log(`All ${current.length} engine advisories have been reviewed.`);
