import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startApplication, type Application } from "../support/http.ts";

const chillDay = "soundcloud:296089690";
const blueBoi = "soundcloud:437080521";
const arcade = "soundcloud:681078026";
const flickermood = "soundcloud:293";

/**
 * Every place private text can be stored gets a marker no other text contains. The sweep then calls
 * every route as each kind of reader and looks for markers that reader must not receive. A response
 * that leaks a field nobody thought to check still contains its marker.
 */
const secret = {
  privateWord: "canary-private-word",
  privateWordDescription: "canary-private-word-description",
  privateWordNote: "canary-note-inside-private-word",
  privateExampleNote: "canary-private-example-note",
  ownerResponse: "canary-owner-response",
  friendPitchNote: "canary-friend-pitch-note",
  otherPitchNote: "canary-other-contributor-pitch-note",
};
/** Stored in a word limited to friends: for a friend to read, and for no one else. */
const friendsOnly = {
  word: "canary-friends-word",
  description: "canary-friends-word-description",
  sharedNote: "canary-friends-shared-note",
};
// Qualities come from a fixed vocabulary, so these two are reserved for private examples in this file.
const privateQualities = ["distorted guitars", "tense mood"];
const openToAll = { publicDescription: "open-public-description", sharedNote: "open-shared-note" };

describe("Private content", () => {
  let app: Application;
  let owner: { cookie: string; user: string };
  let friend: { cookie: string; user: string };
  let other: { cookie: string; user: string };
  let stranger: { cookie: string; user: string };
  let confidant: { cookie: string; user: string };
  let ids: { publicWord: string; privateWord: string; friendsWord: string; shared: string; hidden: string; friendPitch: string; otherPitch: string };

  beforeAll(async () => {
    app = await startApplication();
    owner = await app.signIn("Owner");
    friend = await app.signIn("Friend");
    other = await app.signIn("OtherFriend");
    stranger = await app.signIn("Stranger");
    confidant = await app.signIn("Confidant");
    const created = async (path: string, body: Record<string, unknown>, cookie: string) => {
      const response = await app.request(path, body, cookie);
      expect(response.status).toBe(200);
      return response.body;
    };

    const publicWord = (await created("/wall/associate", { label: "Dreamy", description: openToAll.publicDescription, visibility: "PUBLIC" }, owner.cookie)).association;
    const privateWord = (await created("/wall/associate", { label: secret.privateWord, description: secret.privateWordDescription, visibility: "PRIVATE" }, owner.cookie)).association;
    const shared = (await created("/wall/examples/add", { association: publicWord, item: chillDay, role: "EXAMPLE", note: openToAll.sharedNote, qualities: ["airy vocals"] }, owner.cookie)).annotation;
    await created("/wall/examples/visibility", { annotation: shared, visibility: "SHARED" }, owner.cookie);
    const hidden = (await created("/wall/examples/add", { association: publicWord, item: blueBoi, role: "EXAMPLE", note: secret.privateExampleNote, qualities: [privateQualities[0]] }, owner.cookie)).annotation;
    const inside = (await created("/wall/examples/add", { association: privateWord, item: chillDay, role: "EXAMPLE", note: secret.privateWordNote, qualities: [privateQualities[1]] }, owner.cookie)).annotation;
    // Shared, but inside a private word: the word's visibility must still hide it.
    await created("/wall/examples/visibility", { annotation: inside, visibility: "SHARED" }, owner.cookie);
    const friendPitch = (await created("/suggestions/send", { association: publicWord, item: arcade, note: secret.friendPitchNote }, friend.cookie)).pitch;
    const otherPitch = (await created("/suggestions/send", { association: publicWord, item: flickermood, note: secret.otherPitchNote }, other.cookie)).pitch;
    await created("/suggestions/review", { pitch: friendPitch, fit: "PARTIAL", response: secret.ownerResponse }, owner.cookie);

    // A word for friends, with one shared song and one kept back, and one accepted friend.
    const friendsWord = (await created("/wall/associate", { label: friendsOnly.word, description: friendsOnly.description, visibility: "PRIVATE" }, owner.cookie)).association;
    await created("/wall/visibility", { association: friendsWord, visibility: "LIMITED" }, owner.cookie);
    const forFriends = (await created("/wall/examples/add", { association: friendsWord, item: chillDay, role: "EXAMPLE", note: friendsOnly.sharedNote, qualities: [] }, owner.cookie)).annotation;
    await created("/wall/examples/visibility", { annotation: forFriends, visibility: "SHARED" }, owner.cookie);
    await created("/wall/examples/add", { association: friendsWord, item: blueBoi, role: "EXAMPLE", note: secret.privateExampleNote, qualities: [privateQualities[0]] }, owner.cookie);
    await created("/friends/request", { username: "Owner" }, confidant.cookie);
    await created("/friends/accept", { username: "Confidant" }, owner.cookie);
    // A request that was never accepted grants nothing.
    await created("/friends/request", { username: "Owner" }, stranger.cookie);
    ids = { publicWord, privateWord, friendsWord, shared, hidden, friendPitch, otherPitch };
  });
  afterAll(async () => { await app?.close(); });

  /** One call per route, shaped to pass input validation, aimed at the owner's content. */
  function calls(): Record<string, Record<string, unknown>> {
    return {
      "/auth/login": { username: "nobody-here", password: "not a real password" },
      "/auth/me": {},
      "/auth/register": { username: "x", password: "short" },
      "/wall/list": {},
      "/wall/public": { username: "Owner" },
      "/wall/associate": { label: "", description: "", visibility: "PRIVATE" },
      "/wall/update": { association: ids.privateWord, label: "Renamed", description: "Taken over." },
      "/wall/visibility": { association: ids.privateWord, visibility: "PUBLIC" },
      "/wall/remove": { association: ids.privateWord },
      "/wall/examples/add": { association: ids.privateWord, item: arcade, role: "EXAMPLE", note: "", qualities: [] },
      "/wall/examples/update": { annotation: ids.hidden, role: "EXAMPLE", note: "Rewritten.", qualities: [] },
      "/wall/examples/visibility": { annotation: ids.hidden, visibility: "SHARED" },
      "/wall/examples/remove": { annotation: ids.hidden },
      "/wall/visit": { username: "Owner" },
      "/wall/preview": {},
      "/friends/list": {},
      "/friends/request": { username: "nobody-here" },
      "/friends/accept": { username: "Owner" },
      "/friends/decline": { username: "OtherFriend" },
      "/friends/cancel": { username: "OtherFriend" },
      "/friends/remove": { username: "OtherFriend" },
      "/suggestions/send": { association: ids.privateWord, item: arcade, note: "" },
      "/suggestions/sent": {},
      "/suggestions/withdraw": { pitch: ids.otherPitch },
      "/suggestions/review": { pitch: ids.otherPitch, fit: "MATCH", response: "" },
      "/suggestions/promote": { pitch: ids.friendPitch, note: "", qualities: [] },
      // Last, because it ends the reader's session.
      "/auth/logout": {},
    };
  }

  test("every route is covered by the sweep, so a new route cannot ship without deciding who sees what", () => {
    expect(Object.keys(calls()).sort()).toEqual([...app.routes].sort());
  });

  test("the sweep can see what it is looking for: the owner and a friend receive the markers meant for them", async () => {
    const text = JSON.stringify((await app.request("/wall/list", {}, owner.cookie)).body);
    for (const marker of Object.values(secret)) expect(text).toContain(marker);
    for (const quality of privateQualities) expect(text).toContain(quality);
    expect(text).toContain('"fit":"PARTIAL"');

    const visitor = JSON.stringify((await app.request("/wall/public", { username: "Owner" })).body);
    expect(visitor).toContain(openToAll.publicDescription);
    expect(visitor).toContain(openToAll.sharedNote);
    expect(visitor).toContain("airy vocals");

    // A friend reads the friends' word, so its markers being absent for others is not an accident.
    const asFriend = JSON.stringify((await app.request("/wall/visit", { username: "Owner" }, confidant.cookie)).body);
    for (const marker of Object.values(friendsOnly)) expect(asFriend).toContain(marker);
  });

  test("no route gives a signed-out reader, a stranger, a contributor, or a friend anything beyond what was shared with them", async () => {
    const everything = [...Object.values(secret), ...Object.values(friendsOnly)];
    const readers = [
      { name: "signed out", cookie: "", mayRead: [] as string[] },
      { name: "account with an unanswered friend request", cookie: stranger.cookie, mayRead: [] },
      { name: "contributor who is not a friend", cookie: friend.cookie, mayRead: [secret.friendPitchNote] },
      { name: "friend", cookie: confidant.cookie, mayRead: Object.values(friendsOnly) },
    ];
    const ownerBefore = (await app.request("/wall/list", {}, owner.cookie)).body;

    for (const reader of readers) {
      for (const [path, body] of Object.entries(calls())) {
        const response = await app.request(path, body, reader.cookie);
        const text = JSON.stringify(response.body);
        // A sweep of refusals would pass without reading anything, so the open route must answer.
        if (path === "/wall/public") expect(text).toContain(openToAll.sharedNote);
        if (path === "/auth/me") expect(response.status).toBe(reader.cookie ? 200 : 401);
        for (const marker of everything.filter(value => !reader.mayRead.includes(value))) {
          expect(`${reader.name} ${path}: ${text.includes(marker) ? marker : "clean"}`).toBe(`${reader.name} ${path}: clean`);
        }
        for (const quality of privateQualities) {
          expect(`${reader.name} ${path}: ${text.includes(quality) ? quality : "clean"}`).toBe(`${reader.name} ${path}: clean`);
        }
        expect(`${reader.name} ${path}: ${/"fit"|"response"/.test(text) ? "review" : "clean"}`).toBe(`${reader.name} ${path}: clean`);
      }
    }

    // The sweep also sent every changing request as each reader. None of them may have taken effect.
    expect((await app.request("/wall/list", {}, owner.cookie)).body).toEqual(ownerBefore);
  });

});
