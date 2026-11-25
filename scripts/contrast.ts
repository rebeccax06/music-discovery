/**
 * Prints the contrast ratio of every text color on every surface it appears on, read from the
 * tokens in web/styles.css. Body text needs 4.5:1; control boundaries need 3:1.
 *
 *   bun scripts/contrast.ts
 */
const css = await Bun.file(new URL("../web/styles.css", import.meta.url)).text();
const token = (name: string) => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`No --${name} color token in web/styles.css`);
  return match[1]!;
};

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function ratio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

const pairs: Array<[string, string, string, number]> = [
  ["Ink text", "ink", "canvas", 4.5],
  ["Muted text", "muted", "canvas", 4.5],
  ["Muted text on cards", "muted", "surface", 4.5],
  ["Muted text on a word that needs a song", "muted", "cream", 4.5],
  ["Muted text on an example", "muted", "mint", 4.5],
  ["Muted text on a counterexample", "muted", "peach", 4.5],
  ["Muted text on a selected song or notice", "muted", "accent-soft", 4.5],
  ["Links and text buttons", "accent", "canvas", 4.5],
  ["Links on cards", "accent", "surface", 4.5],
  ["Error text", "error", "canvas", 4.5],
  ["White on the primary button", "surface", "accent", 4.5],
  ["White on a danger button", "surface", "danger", 4.5],
  ["Control boundaries", "control-border", "surface", 3],
  ["Play icon on its circle", "accent", "accent-soft", 3],
  ["Remove word, in red", "danger", "canvas", 4.5],
  ["Tag help link on a selected song", "accent-strong", "accent-soft", 4.5],
  ["Tag explanation", "surface", "ink", 4.5],
];

console.log("| Use | Text | Surface | Ratio | Needs | Result |");
console.log("| --- | --- | --- | --- | --- | --- |");
let failed = 0;
for (const [use, text, surface, needs] of pairs) {
  const value = ratio(token(text), token(surface));
  const pass = value >= needs;
  if (!pass) failed += 1;
  console.log(`| ${use} | \`--${text}\` | \`--${surface}\` | ${value.toFixed(2)} | ${needs} | ${pass ? "pass" : "FAIL"} |`);
}
if (failed) process.exitCode = 1;
