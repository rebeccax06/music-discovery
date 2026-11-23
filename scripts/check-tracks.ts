/**
 * Plays every catalog track in SoundCloud's embedded player and reports what happened.
 *
 * For each track it records whether the widget became ready, SoundCloud's playback policy for it
 * (ALLOW or MONETIZE: the full track plays; SNIP: a preview clip; BLOCK: it will not play), its
 * duration, and whether the playback position advanced, which shows audio is being decoded and
 * played. Whether the sound is audible to a person still needs a person to listen.
 *
 *   bun run check:tracks             print a Markdown table
 *   bun run check:tracks --save      also write it to design/verification/tracks.md
 *
 * A track that is not ready, is blocked, or does not advance fails the run.
 */
import { chromium } from "playwright";
import { catalog, playerUrl } from "../shared/catalog.ts";

type Result = { ready: boolean; policy: string; duration: number; position: number; errors: number };

const page = (src: string) => `<!doctype html><meta charset="utf-8"><title>Track check</title>
<iframe id="player" allow="autoplay" width="400" height="166" src="${src}"></iframe>
<script src="https://w.soundcloud.com/player/api.js"></script>
<script>
  window.result = { ready: false, policy: "unknown", duration: 0, position: 0, errors: 0 };
  const widget = SC.Widget("player");
  widget.bind(SC.Widget.Events.ERROR, () => { window.result.errors += 1; });
  widget.bind(SC.Widget.Events.PLAY_PROGRESS, (event) => {
    window.result.position = Math.max(window.result.position, event.currentPosition);
  });
  widget.bind(SC.Widget.Events.READY, () => {
    window.result.ready = true;
    widget.getCurrentSound((sound) => {
      window.result.policy = (sound && sound.policy) || "unknown";
      window.result.duration = (sound && (sound.full_duration || sound.duration)) || 0;
    });
    widget.setVolume(0);
    widget.play();
  });
</script>`;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const src = new URL(request.url).searchParams.get("src") ?? "";
    return new Response(page(src.replaceAll('"', "&quot;")), { headers: { "Content-Type": "text/html" } });
  },
});

const browser = await chromium.launch({
  channel: process.env.E2E_BROWSER ?? "chrome",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const rows: string[] = [];
let failed = 0;

try {
  for (const entry of catalog) {
    const tab = await browser.newPage();
    const address = `${server.url}?src=${encodeURIComponent(playerUrl(entry))}`;
    let result: Result = { ready: false, policy: "unknown", duration: 0, position: 0, errors: 0 };
    try {
      await tab.goto(address);
      await tab.waitForFunction(() => (window as any).result?.position >= 3000, null, { timeout: 25_000 }).catch(() => {});
      result = await tab.evaluate(() => (window as any).result as Result);
    } finally {
      await tab.close();
    }
    const plays = result.ready && result.position >= 3000 && result.policy !== "BLOCK";
    if (!plays) failed += 1;
    rows.push(`| ${entry.title} | ${entry.artist} | ${result.ready ? "yes" : "no"} | ${result.policy} | ${
      result.duration ? `${Math.round(result.duration / 1000)} s` : "unknown"} | ${(result.position / 1000).toFixed(1)} s | ${plays ? "plays" : "FAILS"} |`);
    console.log(rows.at(-1));
  }
} finally {
  await browser.close();
  server.stop(true);
}

const browserName = process.env.E2E_BROWSER ?? "Google Chrome";
const table = [
  `# Catalog playback`,
  "",
  `Checked ${new Date().toISOString().slice(0, 10)} with \`bun run check:tracks\` in ${browserName}, from one network, with the`,
  "player muted. A track passes when the widget is ready, SoundCloud does not block it, and playback",
  "advances at least 3 seconds. `ALLOW` or `MONETIZE` means the full track plays; `SNIP` means only a preview.",
  "Whether the sound is audible to a person, and whether the tracks play in other regions or",
  "browsers, is not shown by this check.",
  "",
  "| Track | Artist | Ready | Policy | Length | Played to | Result |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...rows,
  "",
  `${catalog.length - failed} of ${catalog.length} tracks play.`,
  "",
].join("\n");

if (process.argv.includes("--save")) await Bun.write(new URL("../design/verification/tracks.md", import.meta.url), table);
console.log(`\n${catalog.length - failed} of ${catalog.length} tracks play.`);
if (failed) process.exitCode = 1;
