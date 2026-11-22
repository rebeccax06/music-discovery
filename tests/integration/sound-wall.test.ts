import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { AnnotatingConcept } from "../../src/concepts/Annotating.ts";
import { assembleApplication, createInstances } from "../../src/assembly.ts";
import { createApi } from "../../src/http.ts";
import { isolatedDatabase } from "../support/mongo.ts";

const origin = "https://sound-it-out.example";

describe("Sound Wall over HTTP", () => {
  let storage: Awaited<ReturnType<typeof isolatedDatabase>>;
  let handler: ReturnType<typeof createApi>;
  let annotations: AnnotatingConcept;

  function restart() {
    const instances = createInstances(storage.db);
    annotations = instances.Annotating;
    handler = createApi(assembleApplication(instances), origin);
  }

  beforeAll(async () => { storage = await isolatedDatabase(); restart(); });
  afterAll(async () => { await storage?.close(); });

  async function request(path: string, body: Record<string, unknown> = {}, cookie = "") {
    const response = await handler(new Request(`${origin}/api${path}`, {
      method: "POST",
      headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json(), cookie: response.headers.get("Set-Cookie") };
  }

  async function signIn(username: string) {
    const credentials = { username, password: "music is subjective" };
    expect((await request("/auth/register", credentials)).status).toBe(200);
    const login = await request("/auth/login", credentials);
    expect(login.status).toBe(200);
    return login.cookie!.split(";")[0]!;
  }

  test("builds a personal wall, shares its public words, and removes examples with a word", async () => {
    const alex = await signIn("Alex");
    const created = await request("/wall/associate", {
      label: "  Dreamy  ",
      description: "  Airy vocals and layered synths.  ",
      visibility: "PRIVATE",
    }, alex);
    expect(created.status).toBe(200);
    const association = (created.body as { association: string }).association;

    restart();
    const listed = await request("/wall/list", {}, alex);
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual({
      wall: {
        words: [{
          association,
          label: "Dreamy",
          description: "Airy vocals and layered synths.",
          visibility: "PRIVATE",
          examples: [],
        }],
      },
    });
    expect((await request("/wall/public", { username: "alex" })).body).toEqual({ owner: "Alex", wall: { words: [] } });

    const me = await request("/auth/me", {}, alex);
    const user = (me.body as { user: string }).user;
    const kept = await annotations.annotate({
      author: user, item: "synth", context: association, role: "EXAMPLE", note: "The synths stay airy.",
    });
    await annotations.setVisibility({ author: user, annotation: kept.annotation, visibility: "SHARED" });
    const hidden = await annotations.annotate({
      author: user, item: "vocal", context: association, role: "COUNTEREXAMPLE", note: "The vocal is too close.",
    });
    const otherWord = await request("/wall/associate", {
      label: "Hype",
      description: "Driving percussion.",
      visibility: "PRIVATE",
    }, alex);
    const hype = (otherWord.body as { association: string }).association;
    const unrelated = await annotations.annotate({
      author: user, item: "drums", context: hype, role: "EXAMPLE", note: "The drums push forward.",
    });

    expect((await request("/wall/update", { association, label: "hype", description: "Airy." }, alex)).status).toBe(409);
    const updated = await request("/wall/update", { association, label: "Dreamy", description: " Airy vocals, far away. " }, alex);
    expect(updated.status).toBe(200);
    expect((await request("/wall/visibility", { association, visibility: "PUBLIC" }, alex)).status).toBe(200);

    const visitor = await request("/wall/public", { username: "ALEX" });
    expect(visitor.status).toBe(200);
    expect(visitor.body).toEqual({
      owner: "Alex",
      wall: {
        words: [{
          association,
          label: "Dreamy",
          description: "Airy vocals, far away.",
          examples: [{ annotation: kept.annotation, item: "synth", role: "EXAMPLE", note: "The synths stay airy." }],
        }],
      },
    });

    const wall = await request("/wall/list", {}, alex);
    const dreamy = (wall.body as { wall: { words: Array<{ label: string; examples: unknown[]; visibility: string }> } })
      .wall.words.find(word => word.label === "Dreamy");
    expect(dreamy?.visibility).toBe("PUBLIC");
    expect(dreamy?.examples).toHaveLength(2);

    const daniel = await signIn("Daniel");
    expect((await request("/wall/update", { association, label: "Dreamy", description: "Not Alex's meaning." }, daniel)).status).toBe(403);
    expect((await request("/wall/remove", { association }, daniel)).status).toBe(403);
    expect((await request("/wall/public", { username: "Alex" }, daniel)).body).toMatchObject({
      wall: { words: [{ label: "Dreamy" }] },
    });

    expect((await request("/wall/remove", { association }, alex)).status).toBe(200);
    expect(await annotations._get(kept)).toEqual([]);
    expect(await annotations._get(hidden)).toEqual([]);
    expect((await annotations._get(unrelated))[0]!.note).toBe("The drums push forward.");
    expect((await request("/wall/public", { username: "Alex" })).body).toEqual({ owner: "Alex", wall: { words: [] } });
    const remaining = await request("/wall/list", {}, alex);
    expect(remaining.body).toEqual({
      wall: {
        words: [{
          association: hype,
          label: "Hype",
          description: "Driving percussion.",
          visibility: "PRIVATE",
          examples: [{
            annotation: unrelated.annotation,
            author: user,
            item: "drums",
            role: "EXAMPLE",
            note: "The drums push forward.",
            visibility: "PRIVATE",
          }],
        }],
      },
    });
  });

  test("refuses a duplicate word, an empty definition, and a private address", async () => {
    const alex = await signIn("CaseListener");
    expect((await request("/wall/associate", { label: " ", description: "A meaning.", visibility: "PRIVATE" }, alex)).status).toBe(400);
    expect((await request("/wall/associate", { label: "warm", description: "Rounded tone.", visibility: "SECRET" }, alex)).status).toBe(400);
    expect((await request("/wall/associate", { label: "w".repeat(41), description: "Too long.", visibility: "PRIVATE" }, alex)).status).toBe(400);
    expect((await request("/wall/associate", { label: "warm", description: "Rounded tone.", visibility: "PRIVATE" }, alex)).status).toBe(200);
    expect((await request("/wall/associate", { label: " Warm ", description: "Another tone.", visibility: "PUBLIC" }, alex)).status).toBe(409);
    expect((await request("/wall/list", {}, alex)).body).toMatchObject({
      wall: { words: [{ label: "warm", description: "Rounded tone.", visibility: "PRIVATE" }] },
    });
    expect((await request("/wall/public", { username: "nobody-here" })).status).toBe(404);
  });
});
