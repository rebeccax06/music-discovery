import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";
import { startTarget } from "./target.ts";

/**
 * The journeys from the product brief, driven through the real interface in a real browser against
 * a real database. Nothing here calls the API or the database directly.
 *
 * "No page refresh" is part of what is checked: a page is reloaded only where a step says it is
 * checking persistence. Everything else must appear as a result of the action itself or of ordinary
 * navigation inside the app.
 */
const run = crypto.randomUUID().slice(0, 6);
const alexName = `alex-${run}`;
const danielName = `daniel-${run}`;
const password = "music is subjective";
const WAIT = Number(process.env.E2E_WAIT ?? 15_000);
const shots = process.env.E2E_SCREENSHOTS;

let target: Awaited<ReturnType<typeof startTarget>>;
let browser: Browser;
let alexContext: BrowserContext;
let danielContext: BrowserContext;
let strangerContext: BrowserContext;
let alex: Page;
let daniel: Page;
let wordLink = "";

async function visible(locator: Locator) {
  await locator.first().waitFor({ state: "visible", timeout: WAIT });
}

async function gone(locator: Locator) {
  await locator.first().waitFor({ state: "detached", timeout: WAIT });
}

async function snap(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

async function createAccount(scope: Page | Locator, username: string) {
  await scope.getByRole("button", { name: "Create an account" }).click();
  await scope.getByLabel("Username").fill(username);
  await scope.getByLabel("Password").fill(password);
  await scope.getByRole("button", { name: "Create account" }).click();
}

const song = (scope: Page | Locator, title: string) => scope.locator(".picker .song").filter({ hasText: title });
const example = (page: Page, title: string) => page.locator(".word-page .examples > .example").filter({ hasText: title });
const chip = (scope: Locator, label: string) => scope.getByRole("button", { name: label, exact: true });
const nav = (page: Page, name: string | RegExp) => page.getByRole("navigation", { name: "Main" }).getByRole("link", { name });

beforeAll(async () => {
  target = await startTarget();
  browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "chrome" });
  alexContext = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  danielContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  strangerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  for (const context of [alexContext, danielContext, strangerContext]) context.setDefaultTimeout(WAIT);
  alex = await alexContext.newPage();
  daniel = await danielContext.newPage();
  console.log(`Browser journeys against ${target.url}${target.deployed ? " (deployed)" : " (started for this run)"}`);
});

afterAll(async () => {
  // A page still playing audio can hold the browser open; never let cleanup hang the run.
  const within = (work: Promise<unknown> | undefined) => Promise.race([work, Bun.sleep(10_000)]);
  await within(browser?.close());
  await within(target?.stop());
});

describe("Journey A: build a word from music", () => {
  test("a new person picks a word with one tap and lands on it with the song library open", async () => {
    await alex.goto(target.url);
    await snap(alex, "a1-welcome");
    await createAccount(alex, alexName);
    await visible(alex.getByRole("heading", { name: "Choose a word" }));
    await snap(alex, "a2-choose-word");

    await alex.getByRole("button", { name: "Dreamy", exact: true }).click();
    await visible(alex.getByRole("heading", { name: "Dreamy", exact: true, level: 1 }));
    expect(new URL(alex.url()).searchParams.get("word")).toBe("dreamy");
    await visible(alex.getByText("Private · only you can open this word"));
    await visible(alex.getByText("Pick what you hear in a song and a description writes itself."));
    await visible(alex.getByRole("heading", { name: "Add a song to Dreamy" }));
    await visible(alex.getByText("A small library of tracks we have checked, not all of SoundCloud."));
  });

  test("the official SoundCloud player loads the chosen catalog track", async () => {
    const row = song(alex, "Chill Day");
    await row.getByRole("button", { name: "Play Chill Day by LAKEY INSPIRED" }).click();
    const frame = row.locator("iframe");
    await visible(frame);
    const source = new URL((await frame.getAttribute("src"))!);
    expect(source.origin).toBe("https://w.soundcloud.com");
    expect(source.searchParams.get("url")).toBe("https://api.soundcloud.com/tracks/296089690");
    expect(await frame.getAttribute("title")).toBe("SoundCloud player: Chill Day by LAKEY INSPIRED");

    // Depends on SoundCloud answering from wherever this runs. Required unless E2E_OFFLINE is set.
    const ready = await row.locator('.track[data-player="ready"]').waitFor({ timeout: 20_000 }).then(() => true, () => false);
    console.log(`SoundCloud player reported READY for Chill Day: ${ready ? "yes" : "no"}`);
    if (!process.env.E2E_OFFLINE) expect(ready).toBe(true);
  });

  test("picking what you hear adds the song privately and writes the draft, which follows the next song", async () => {
    const first = song(alex, "Chill Day");
    await first.getByRole("button", { name: "Choose Chill Day" }).click();
    const picker = chip(first, "airy vocals");
    await picker.focus();
    await alex.keyboard.press("Space");
    expect(await picker.getAttribute("aria-pressed")).toBe("true");
    await chip(first, "soft drums").click();
    await visible(first.getByText("2 of 5"));
    await snap(alex, "a3-picking-qualities");
    await first.getByRole("button", { name: "Add to Dreamy" }).click();

    await visible(example(alex, "Chill Day").getByText("Only you"));
    await visible(alex.getByText("For you, “Dreamy” means airy vocals and soft drums."));
    await visible(alex.getByText("Draft from the qualities you picked."));
    await visible(song(alex, "Chill Day").getByText("Added"));

    const second = song(alex, "Blue Boi");
    await second.getByRole("button", { name: "Choose Blue Boi" }).click();
    await chip(second, "airy vocals").click();
    await chip(second, "layered synths").click();
    await second.getByRole("button", { name: "Add to Dreamy" }).click();
    await visible(example(alex, "Blue Boi"));
    await visible(alex.getByText("For you, “Dreamy” often means airy vocals, with soft drums or layered synths."));
  });

  test("a save that fails says so and keeps everything the person picked and wrote", async () => {
    const row = song(alex, "Arcade");
    await row.getByRole("button", { name: "Choose Arcade" }).click();
    await chip(row, "heavy drums").click();
    await row.getByLabel("Anything else?").fill("The drop.");

    await alexContext.route("**/api/wall/examples/add", route => route.abort());
    await row.getByRole("button", { name: "Add to Dreamy" }).click();
    await visible(row.getByRole("alert").filter({ hasText: "Could not reach Sound It Out" }));
    expect(await chip(row, "heavy drums").getAttribute("aria-pressed")).toBe("true");
    expect(await row.getByLabel("Anything else?").inputValue()).toBe("The drop.");
    expect(await example(alex, "Arcade").count()).toBe(0);
    await snap(alex, "a4-save-failed");

    await alexContext.unroute("**/api/wall/examples/add");
    await row.getByRole("button", { name: "Add to Dreamy" }).click();
    await visible(example(alex, "Arcade").getByText("The drop."));
    await alex.getByRole("button", { name: "Done" }).click();
    await snap(alex, "a5-word-with-songs");
  });

  test("a word the person already has is offered, not created twice", async () => {
    await alex.getByRole("button", { name: "← All words" }).click();
    await visible(alex.getByRole("heading", { name: "Your Sound Wall" }));
    await visible(alex.getByRole("button", { name: "Dreamy, 3 songs · Private" }));
    await snap(alex, "a6-wall");
    await alex.getByRole("button", { name: "Add word" }).click();
    expect(await alex.getByRole("button", { name: "Dreamy", exact: true }).count()).toBe(0);
    await alex.getByLabel("Or your own word").fill("  dreamy ");
    await visible(alex.getByText("You already have"));
    expect(await alex.locator("form").getByRole("button", { name: "Add word" }).isDisabled()).toBe(true);
    await alex.getByRole("status").getByRole("button", { name: "Dreamy" }).click();
    await visible(alex.getByRole("heading", { name: "Dreamy", exact: true, level: 1 }));
    expect(await example(alex, "").count()).toBe(3);
  });

  test("editing a private song note keeps it private and saves it across a reload", async () => {
    const card = example(alex, "Blue Boi");
    await card.getByRole("button", { name: "Edit what you hear in this song" }).click();
    await card.getByLabel("Anything else?").fill("The opening notes trail off gently.");
    await card.getByRole("button", { name: "Save", exact: true }).click();
    await visible(card.getByText("The opening notes trail off gently."));
    await visible(card.getByText("Only you"));
    await alex.reload();
    await visible(card.getByText("The opening notes trail off gently."));
    await visible(card.getByText("Only you"));
  });

  test("sharing with friends shows exactly what friends and everyone else will see", async () => {
    await alex.getByRole("button", { name: "Share…" }).click();
    await alex.getByLabel(/Your friends/).check();
    await visible(alex.getByText("No songs are shown with Dreamy yet, so friends would see only the word."));
    await alex.getByRole("button", { name: "Cancel" }).click();
    // Cancelling leaves the word, and the choice shown, as they were.
    expect(await alex.getByLabel(/Only you/).isChecked()).toBe(true);
    expect(await alex.getByLabel(/Your friends/).isChecked()).toBe(false);

    await alex.getByRole("checkbox", { name: "Chill Day by LAKEY INSPIRED" }).check();
    await visible(example(alex, "Chill Day").getByText("Shared"));
    await alex.getByLabel(/Your friends/).check();
    await visible(alex.getByText("Shared with friends · 1 of 3 songs shown"));

    const preview = alex.locator(".preview");
    await visible(preview.getByText(`For ${alexName}, “Dreamy” means airy vocals and soft drums.`));
    await visible(preview.getByText("Chill Day"));
    expect(await preview.getByText("Blue Boi").count()).toBe(0);
    expect(await preview.getByText("The drop.").count()).toBe(0);
    await visible(alex.getByText("People who aren’t your friends can’t open it."));
    await snap(alex, "a7-share-with-friends");

    wordLink = await alex.getByLabel("Link to this word").inputValue();
    expect(wordLink).toBe(`${target.url}/?wall=${alexName}&word=dreamy`);
  });

  test("a failed attempt to hide a shared song leaves the checkbox honest and can be retried", async () => {
    const panel = alex.getByRole("region", { name: "Share", exact: true });
    const setting = panel.getByRole("checkbox", { name: "Chill Day by LAKEY INSPIRED" });
    const endpoint = "**/api/wall/examples/visibility";
    await alexContext.route(endpoint, route => route.abort(), { times: 1 });

    await setting.click();
    await visible(panel.getByRole("alert").filter({ hasText: "Could not reach Sound It Out" }));
    expect(await setting.isChecked()).toBe(true);
    await visible(panel.locator(".preview").getByText("Chill Day"));

    await setting.click();
    await visible(example(alex, "Chill Day").getByText("Only you"));
    expect(await setting.isChecked()).toBe(false);
    await gone(panel.locator(".preview").getByText("Chill Day"));
    await setting.click();
    await visible(example(alex, "Chill Day").getByText("Shared"));
    await visible(panel.locator(".preview").getByText("Chill Day"));
  });

  test("narrowing a public word to friends protects the songs before sharing them", async () => {
    const context = await browser.newContext();
    context.setDefaultTimeout(WAIT);
    const owner = await context.newPage();
    const visitor = await strangerContext.newPage();
    const username = `audience-${run}`;
    const note = "A note intended for friends.";
    try {
      await owner.goto(target.url);
      await createAccount(owner, username);
      await owner.getByLabel("Or your own word").fill("Lush");
      await owner.locator("form").getByRole("button", { name: "Add word", exact: true }).click();
      const track = song(owner, "Chill Day");
      await track.getByRole("button", { name: "Choose Chill Day" }).click();
      await track.getByLabel("Anything else?").fill(note);
      await track.getByRole("button", { name: "Add to Lush" }).click();
      await visible(example(owner, "Chill Day").getByText("Only you"));

      await owner.getByRole("button", { name: "Share…" }).click();
      const panel = owner.getByRole("region", { name: "Share", exact: true });
      await panel.getByLabel(/Anyone with the link/).check();
      await panel.getByRole("button", { name: "Share only the word" }).click();
      await visible(owner.getByText("Public · 0 of 1 song shown"));
      const link = await panel.getByLabel("Link to this word").inputValue();

      await context.route("**/api/wall/visibility", route => route.abort(), { times: 1 });
      await panel.getByLabel(/Your friends/).check();
      await panel.getByRole("button", { name: "Show the song too" }).click();
      await visible(panel.getByRole("alert").filter({ hasText: "Could not reach Sound It Out" }));
      await visitor.goto(link);
      await visible(visitor.getByRole("heading", { name: `${username}’s Lush`, level: 1 }));
      expect(await visitor.getByText(note).count()).toBe(0);
      expect(await panel.getByRole("checkbox").isChecked()).toBe(false);

      await panel.getByLabel(/Your friends/).check();
      await panel.getByRole("button", { name: "Show the song too" }).click();
      await visible(owner.getByText("Shared with friends · 1 of 1 song shown"));
      await visitor.reload();
      await visible(visitor.getByText(`If ${username} shared it with friends, sign in to see it.`));
      expect(await visitor.getByText(note).count()).toBe(0);
    } finally {
      await visitor.close();
      await context.close();
    }
  });

  test("the owner's own words replace the draft, and changing songs never touches them", async () => {
    await alex.getByRole("button", { name: "Write your own" }).click();
    const editor = alex.getByLabel("What Dreamy means to you");
    expect(await editor.inputValue()).toBe("For you, “Dreamy” often means airy vocals, with soft drums, heavy drums or layered synths.");
    await editor.fill("Like hearing a party from the next room.");
    await alex.getByRole("button", { name: "Save description" }).click();
    await visible(alex.locator(".description .definition", { hasText: "Like hearing a party from the next room." }));
    expect(await alex.getByText("Draft from the qualities you picked.").count()).toBe(0);

    const card = example(alex, "Blue Boi");
    await card.getByRole("button", { name: "Remove this song" }).click();
    await visible(card.getByText("Remove this song from Dreamy? Your note and picked qualities will be deleted."));
    await card.getByRole("button", { name: "Remove song" }).click();
    await gone(example(alex, "Blue Boi"));
    await visible(alex.locator(".description .definition", { hasText: "Like hearing a party from the next room." }));
    await visible(alex.locator(".preview .definition", { hasText: "Like hearing a party from the next room." }));
  });
});

describe("Journey B: become friends and suggest a song", () => {
  test("a friends' word is closed to someone who is not a friend, and says how to get in without revealing it", async () => {
    await daniel.goto(wordLink);
    await visible(daniel.getByRole("heading", { name: `${alexName}’s Sound Wall`, level: 1 }));
    await visible(daniel.getByText(`If ${alexName} shared it with friends, sign in to see it.`));
    expect(await daniel.locator("main").innerText()).not.toContain("Like hearing a party");
    await snap(daniel, "b1-closed-signed-out");
  });

  test("signing in on the wall keeps the visitor there and offers to add the owner as a friend", async () => {
    await daniel.getByRole("button", { name: "Sign in or create an account" }).click();
    await createAccount(daniel.locator(".visitor-invite"), danielName);
    await visible(daniel.getByRole("button", { name: `Add ${alexName} as a friend` }));
    expect(new URL(daniel.url()).searchParams.get("wall")).toBe(alexName);
    await visible(daniel.getByText(`If ${alexName} shared it with friends, it appears once you are friends.`));
    await daniel.getByRole("button", { name: `Add ${alexName} as a friend` }).click();
    await visible(daniel.getByText(`Friend request sent. When ${alexName} accepts, you’ll see the words they share with friends.`));
    await snap(daniel, "b2-request-sent");
  });

  test("the owner sees the request waiting and accepts it from the Friends page", async () => {
    await nav(alex, /Friends/).click();
    await visible(alex.getByRole("heading", { name: "Friends", level: 1 }));
    const requests = alex.locator(".requests");
    await visible(requests.getByText(danielName));
    await snap(alex, "b3-request-waiting");
    await requests.getByRole("button", { name: `Accept ${danielName}` }).click();
    await gone(alex.locator(".requests"));
    await visible(alex.locator(".friend-card").getByRole("heading", { name: danielName }));
  });

  test("once friends, the visitor finds the word among their friends' words and opens it", async () => {
    await nav(daniel, /Friends/).click();
    const card = daniel.locator(".friend-card").filter({ hasText: alexName });
    await visible(card.getByRole("button", { name: /Dreamy/ }));
    await visible(card.getByText("1 song · Friends"));
    await snap(daniel, "b4-friends-page");
    await card.getByRole("button", { name: /Dreamy/ }).click();

    await visible(daniel.getByRole("heading", { name: `${alexName}’s Dreamy`, level: 1 }));
    await visible(daniel.getByText("Like hearing a party from the next room."));
    const songs = daniel.locator(".shared-word .example");
    expect(await songs.count()).toBe(1);
    await visible(songs.getByText("Chill Day"));
    await visible(songs.getByText("airy vocals"));
    const text = await daniel.locator("main").innerText();
    expect(text).not.toContain("Arcade");
    expect(text).not.toContain("The drop.");
    expect(text).not.toContain("Only you");
    for (const control of ["Add a song", "Share…", "Rename", "Remove word", "Edit description"]) {
      expect(await daniel.getByRole("button", { name: control }).count()).toBe(0);
    }
    const overflow = await daniel.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("a suggestion is confirmed as a suggestion, listed as waiting, and can be withdrawn until reviewed", async () => {
    await daniel.getByRole("button", { name: "Suggest a song" }).click();
    await visible(daniel.getByRole("heading", { name: `Suggest a song for ${alexName}’s Dreamy` }));
    await visible(song(daniel, "Chill Day").getByText("Already on this word"));
    expect(await song(daniel, "Chill Day").getByRole("button", { name: /Choose/ }).count()).toBe(0);

    const row = song(daniel, "Warm Nights");
    await row.getByRole("button", { name: "Choose Warm Nights" }).click();
    expect(await row.getByText("What do you hear?").count()).toBe(0);
    await row.getByLabel("Why this song?").fill("Soft and far away.");
    await row.getByRole("button", { name: "Send suggestion" }).click();
    await visible(daniel.getByText(`Sent to ${alexName} · it’s a suggestion until ${alexName} adds it`));

    const sent = daniel.locator(".word-page .suggestion");
    await visible(sent.filter({ hasText: "Warm Nights" }).getByText(`Waiting for ${alexName}`));
    await visible(song(daniel, "Warm Nights").getByText("You suggested this"));
    expect(await daniel.locator(".shared-word .example").count()).toBe(1);

    const extra = song(daniel, "Days Like These");
    await extra.getByRole("button", { name: "Choose Days Like These" }).click();
    await extra.getByRole("button", { name: "Send suggestion" }).click();
    const withdrawn = sent.filter({ hasText: "Days Like These" });
    await visible(withdrawn);
    await withdrawn.getByRole("button", { name: "Withdraw this suggestion" }).click();
    await gone(withdrawn);
    expect(await sent.count()).toBe(1);
    await snap(daniel, "b5-suggestion-sent");
  });
});

describe("Journey C: review and accept a suggestion", () => {
  test("the owner finds the suggestion on their wall, apart from their songs", async () => {
    await nav(alex, "Your wall").click();
    await visible(alex.getByRole("button", { name: "Dreamy, 2 songs · Friends · 1 suggestion to review" }));
    await alex.getByRole("button", { name: /^Dreamy,/ }).click();

    const queue = alex.locator(".suggestions");
    await visible(queue.getByText("1 to review"));
    await visible(queue.getByText(`Suggested by ${danielName}`));
    await visible(queue.getByText("“Soft and far away.”"));
    await visible(queue.getByText("Only you can see your reviews."));
    expect(await example(alex, "Warm Nights").count()).toBe(0);
    expect(await queue.getByText("Days Like These").count()).toBe(0);
    await snap(alex, "c1-review-queue");
  });

  test("a match is saved privately, and adding it to the examples is a separate step that starts private", async () => {
    const card = alex.locator(".suggestion").filter({ hasText: "Warm Nights" });
    expect(await card.getByRole("button", { name: "Add to examples" }).count()).toBe(0);
    await card.getByRole("button", { name: /Match/ }).click();
    await card.getByLabel("A note to yourself about why").fill("The reverb is exactly it.");
    await card.getByRole("button", { name: "Save review" }).click();
    await visible(alex.getByText("Review saved · only you can see it"));
    await visible(alex.locator(".suggestions").getByText("all reviewed"));
    expect(await example(alex, "Warm Nights").count()).toBe(0);

    await card.getByRole("button", { name: "Add to examples" }).click();
    await chip(card, "lots of reverb").click();
    await card.getByRole("button", { name: "Add to Dreamy" }).click();
    await visible(example(alex, "Warm Nights").getByText("Only you"));
    await visible(example(alex, "Warm Nights").getByText("lots of reverb"));
    await visible(card.getByText("In your examples"));
    expect(await card.getByRole("button", { name: "Add to examples" }).count()).toBe(0);
    await visible(alex.getByText("Shared with friends · 1 of 3 songs shown"));
    await snap(alex, "c2-match-added");
  });

  test("the contributor learns it was reviewed but not how, and still sees only what the owner shared", async () => {
    await nav(daniel, /Friends/).click();
    const followed = daniel.locator(".friends-page .suggestion").filter({ hasText: "Warm Nights" });
    await visible(followed.getByText("Reviewed", { exact: true }));
    await visible(followed.getByText(`For ${alexName}’s “Dreamy”`));
    expect(await followed.getByRole("button", { name: /Withdraw/ }).count()).toBe(0);
    const text = await daniel.locator("main").innerText();
    expect(text).not.toContain("The reverb is exactly it.");
    expect(text).not.toContain("Match");
    await followed.getByRole("button", { name: "Open the word" }).click();
    await visible(daniel.getByRole("heading", { name: `${alexName}’s Dreamy`, level: 1 }));
    await visible(daniel.locator(".shared-word .example"));
    expect(await daniel.locator(".shared-word .example").count()).toBe(1);
  });

  test("everything is still there after both people reload", async () => {
    await alex.reload();
    await visible(alex.getByRole("heading", { name: "Dreamy", exact: true, level: 1 }));
    await visible(alex.locator(".description .definition", { hasText: "Like hearing a party from the next room." }));
    expect(await example(alex, "").count()).toBe(3);
    await visible(example(alex, "Chill Day").getByText("Shared"));
    await visible(alex.locator(".suggestion").filter({ hasText: "Warm Nights" }).getByText("In your examples"));

    await daniel.reload();
    await visible(daniel.getByRole("heading", { name: `${alexName}’s Dreamy`, level: 1 }));
    await visible(daniel.locator(".word-page .suggestion").filter({ hasText: "Warm Nights" }).getByText("Reviewed", { exact: true }));
  });

  test("making the word public opens it to a signed-out stranger, who sees only the shared song", async () => {
    await alex.getByRole("button", { name: "Share…" }).click();
    await alex.getByLabel(/Anyone with the link/).check();
    await visible(alex.getByText("People who aren’t your friends see the same."));

    const stranger = await strangerContext.newPage();
    await stranger.goto(wordLink);
    await visible(stranger.getByRole("heading", { name: `${alexName}’s Dreamy`, level: 1 }));
    const songs = stranger.locator(".shared-word .example");
    expect(await songs.count()).toBe(1);
    await visible(songs.getByText("Chill Day"));
    const text = await stranger.locator("main").innerText();
    expect(text).not.toContain("Warm Nights");
    expect(text).not.toContain("Soft and far away.");
    const overflow = await stranger.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await snap(stranger, "c3-public-signed-out");
    await stranger.close();
  });

  test("ending the friendship closes friends' words at once; Back closes a word; removing a word is final", async () => {
    await alex.getByLabel(/Your friends/).check();
    await visible(alex.getByText("People who aren’t your friends can’t open it."));
    await nav(alex, /Friends/).click();
    const card = alex.locator(".friend-card").filter({ hasText: danielName });
    await card.getByRole("button", { name: `Remove ${danielName} as a friend` }).click();
    await card.getByRole("button", { name: "Remove friend" }).click();
    await gone(alex.locator(".friend-card"));

    await daniel.reload();
    await visible(daniel.getByText(`If ${alexName} shared it with friends, it appears once you are friends.`));
    expect(await daniel.locator("main").innerText()).not.toContain("Like hearing a party");

    await nav(alex, "Your wall").click();
    await alex.getByRole("button", { name: /^Dreamy,/ }).click();
    await visible(alex.getByRole("heading", { name: "Dreamy", exact: true, level: 1 }));
    await alex.goBack();
    await visible(alex.getByRole("heading", { name: "Your Sound Wall" }));
    await alex.goForward();
    await visible(alex.getByRole("heading", { name: "Dreamy", exact: true, level: 1 }));

    await alex.getByRole("button", { name: "Remove word" }).click();
    await visible(alex.getByText("Remove Dreamy, its 3 songs, and the suggestions made for it? This cannot be undone."));
    await alex.locator(".confirm").getByRole("button", { name: "Remove word" }).click();
    await visible(alex.getByRole("heading", { name: "Choose a word" }));
  });
});

describe("Journey D: recovering when things go wrong", () => {
  const samName = `sam-${run}`;
  let sam: Page;
  let warmLink = "";

  test("a track that will not load says so and offers SoundCloud, and can still be added", async () => {
    await visible(alex.getByRole("heading", { name: "Choose a word" }));
    await alex.getByRole("button", { name: "Warm", exact: true }).click();
    await visible(alex.getByRole("heading", { name: "Add a song to Warm" }));

    await alexContext.route("https://w.soundcloud.com/**", route => route.abort());
    const row = song(alex, "Better Days");
    await row.getByRole("button", { name: "Play Better Days by LAKEY INSPIRED" }).click();
    await visible(row.getByText("This track isn’t loading here."));
    expect(await row.locator("iframe").isVisible()).toBe(false);
    expect(await row.getByRole("link", { name: "Open it on SoundCloud" }).getAttribute("href"))
      .toBe("https://soundcloud.com/lakeyinspired/better-days");
    await snap(alex, "d1-playback-unavailable");
    await row.getByRole("button", { name: "Choose Better Days" }).click();
    await row.getByRole("button", { name: "Add to Warm" }).click();
    await visible(example(alex, "Better Days"));
    await alexContext.unroute("https://w.soundcloud.com/**");
  });

  test("a session that ends mid-task keeps what was entered, and the task finishes after signing in again", async () => {
    const row = song(alex, "Journeyman");
    await row.getByRole("button", { name: "Choose Journeyman" }).click();
    await chip(row, "warm bass").click();
    await row.getByLabel("Anything else?").fill("The low end.");
    await alexContext.clearCookies();

    await row.getByRole("button", { name: "Add to Warm" }).click();
    await visible(alex.getByText("Your session has ended. Sign in again to continue. What you entered on this page is still here, and you’ll go back to it."));
    // The sign-in form comes to the person instead of waiting at the top of a long page.
    await alex.waitForFunction(() => document.activeElement?.closest(".session-ended") !== null);
    expect(await chip(row, "warm bass").getAttribute("aria-pressed")).toBe("true");
    expect(await row.getByLabel("Anything else?").inputValue()).toBe("The low end.");
    await snap(alex, "d2-session-ended");

    const panel = alex.locator(".session-ended");
    await panel.getByLabel("Username").fill(alexName);
    await panel.getByLabel("Password").fill(password);
    await panel.getByRole("button", { name: "Sign in" }).click();
    await gone(panel);
    // Signing in returns the person to the button they pressed.
    await alex.waitForFunction(() => document.activeElement?.textContent?.trim() === "Add to Warm");
    await row.getByRole("button", { name: "Add to Warm" }).click();
    await visible(example(alex, "Journeyman").getByText("The low end."));
    await alex.getByRole("button", { name: "Done" }).click();
  });

  test("a song someone else already suggested is refused with a way forward, keeping the person's place", async () => {
    await alex.getByRole("button", { name: "Share…" }).click();
    await alex.getByLabel(/Anyone with the link/).check();
    await alex.getByRole("button", { name: "Show all 2 songs too" }).click();
    await visible(alex.getByText("Public · 2 of 2 songs shown"));
    warmLink = await alex.getByLabel("Link to this word").inputValue();

    await daniel.goto(warmLink);
    await daniel.getByRole("button", { name: "Suggest a song" }).click();
    const first = song(daniel, "Flickermood");
    await first.getByRole("button", { name: "Choose Flickermood" }).click();
    await first.getByRole("button", { name: "Send suggestion" }).click();
    await visible(daniel.locator(".word-page .suggestion").filter({ hasText: "Flickermood" }));

    sam = await strangerContext.newPage();
    await sam.goto(warmLink);
    await sam.getByRole("button", { name: "Sign in or create an account" }).click().catch(() => {});
    await sam.getByRole("button", { name: "Suggest a song" }).click();
    await createAccount(sam.locator(".word-page"), samName);
    const row = song(sam, "Flickermood");
    await row.getByRole("button", { name: "Choose Flickermood" }).click();
    await row.getByLabel("Why this song?").fill("Same idea.");
    await row.getByRole("button", { name: "Send suggestion" }).click();
    await visible(row.getByRole("alert").filter({ hasText: "This song has already been suggested for this word. Pick another?" }));
    expect(await row.getByLabel("Why this song?").inputValue()).toBe("Same idea.");
    await snap(sam, "d3-duplicate-suggestion");
  });

  test("a request the server never answers is reported as a failure that keeps the pick, and sending again works", async () => {
    // The engine answers an unanswered request with 500 INTERNAL_ERROR (design/verification/advisories.md).
    // Nothing was written in that case, so trying again is safe.
    const row = song(sam, "Days Like These");
    await row.getByRole("button", { name: "Choose Days Like These" }).click();
    await row.getByLabel("Why this song?").fill("Worth a retry.");
    await strangerContext.route("**/api/suggestions/send", route =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "INTERNAL_ERROR" }) }));
    await row.getByRole("button", { name: "Send suggestion" }).click();
    await visible(row.getByRole("alert").filter({ hasText: "Could not send your suggestion. Your pick is still here. Try again." }));
    expect(await row.getByLabel("Why this song?").inputValue()).toBe("Worth a retry.");

    await strangerContext.unroute("**/api/suggestions/send");
    await row.getByRole("button", { name: "Send suggestion" }).click();
    await visible(sam.locator(".word-page .suggestion").filter({ hasText: "Days Like These" }));
  });

  test("a word removed while someone is suggesting for it is reported plainly, not as sent", async () => {
    const row = song(sam, "Arcade");
    await row.getByRole("button", { name: "Choose Arcade" }).click();

    await alex.getByRole("button", { name: "Remove word" }).click();
    await alex.locator(".confirm").getByRole("button", { name: "Remove word" }).click();
    await visible(alex.getByRole("heading", { name: "Choose a word" }));

    await row.getByRole("button", { name: "Send suggestion" }).click();
    await visible(row.getByRole("alert").filter({ hasText: "You can no longer open this word." }));
    expect(await sam.locator(".word-page .suggestion").filter({ hasText: "Arcade" }).count()).toBe(0);
    await snap(sam, "d4-word-removed");
  });

  test("the account menu reveals sign out, closes with Escape, and signs out", async () => {
    const account = sam.getByRole("button", { name: samName, exact: true });
    const signOut = sam.getByRole("button", { name: "Sign out", exact: true });
    expect(await signOut.count()).toBe(0);
    await account.click();
    expect(await account.getAttribute("aria-expanded")).toBe("true");
    await visible(signOut);
    await sam.keyboard.press("Escape");
    expect(await account.getAttribute("aria-expanded")).toBe("false");
    await sam.waitForFunction(() => document.activeElement?.getAttribute("aria-expanded") === "false");
    await account.click();
    await signOut.click();
    await gone(sam.getByRole("navigation", { name: "Main" }));
    expect(await account.count()).toBe(0);
  });
});
