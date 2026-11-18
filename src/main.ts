import { MongoClient } from "mongodb";
import { assembleApplication, createInstances } from "./assembly.ts";
import { createApi } from "./http.ts";
import { buildFrontend } from "../web/serve.ts";

const port = Number(process.env.PORT ?? 3000);
const publicOrigin = process.env.PUBLIC_ORIGIN ?? `http://127.0.0.1:${port}`;
const mongoUrl = process.env.MONGODB_URL ?? "mongodb://dev:dev@127.0.0.1:27017/sound-it-out?authSource=admin";
const client = new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 3000 });
const db = client.db();
const api = createApi(assembleApplication(createInstances(db)), publicOrigin);
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
