import { MongoClient } from "mongodb";
import { assembleApplication, createInstances } from "./assembly.ts";
import { createCommonsProvider } from "./commonsProvider.ts";
import { createApi } from "./http.ts";
import { clearOrphans } from "./maintenance.ts";
import { buildFrontend } from "../web/serve.ts";

const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 3000);

/** A setting that has a local default but must be given explicitly when deployed. */
function setting(names: string[], localDefault: string) {
  const value = names.map(name => process.env[name]).find(Boolean);
  if (value) return value;
  if (production) throw new Error(`${names.join(" or ")} is not set. Add it in the hosting settings; see README.md.`);
  return localDefault;
}

// Sign-in is accepted only from this address, so a deployment must name its own https address.
const publicOrigin = setting(["PUBLIC_ORIGIN"], `http://127.0.0.1:${port}`).replace(/\/$/, "");
// The course platform's database dialog suggests MONGODB_URI; either name works.
const mongoUrl = setting(["MONGODB_URL", "MONGODB_URI"], "mongodb://dev:dev@127.0.0.1:27017/sound-it-out?authSource=admin");
// The hosted database allows 10 connections, and a rolling deploy briefly runs two copies of the app.
const client = new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 3000, maxPoolSize: 5 });
const db = client.db();
const commons = createCommonsProvider(process.env.COMMONS_ORIGIN ?? "https://class.mit-sdg.dev", publicOrigin);
const application = assembleApplication(createInstances(db, commons));
const api = createApi(application, publicOrigin);
const frontend = await buildFrontend();

async function ping() {
  await db.command({ ping: 1 }, { timeoutMS: 2000 });
}

try {
  await ping();
} catch (error) {
  await client.close();
  throw new Error("Could not connect to MongoDB. Check MONGODB_URL and that MongoDB is running.", { cause: error });
}

// Recover from any repair that failed before this start. A deployment restarts the server.
const cleared = await clearOrphans(application.concepts);
if (cleared.songs || cleared.suggestions) {
  console.warn(`Cleared songs for ${cleared.songs} and suggestions for ${cleared.suggestions} removed words left by a failed repair.`);
}

const server = Bun.serve({
  hostname: process.env.HOST ?? (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
  port,
  routes: {
    "/api/*": api,
    "/health": async (request) => {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
      }
      const ready = await ping().then(() => true, () => false);
      const headers = { "Cache-Control": "no-store" };
      const status = ready ? 200 : 503;
      return request.method === "HEAD"
        ? new Response(null, { status, headers })
        : Response.json({ status: ready ? "ok" : "unavailable" }, { status, headers });
    },
  },
  fetch: frontend,
});

async function stop() {
  await server.stop();
  await client.close();
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
console.log(`Sound It Out is listening at ${server.url}`);
