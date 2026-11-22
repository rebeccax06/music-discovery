import { MongoClient } from "mongodb";

/**
 * What the browser journeys run against. With BASE_URL set, that address: this is how the deployed
 * build is checked. Otherwise a server started here on its own port and its own database, which is
 * dropped afterward.
 */
export async function startTarget() {
  const deployed = process.env.BASE_URL?.replace(/\/$/, "");
  if (deployed) return { url: deployed, deployed: true, stop: async () => {} };

  const port = 3100 + Math.floor(Math.random() * 800);
  const url = `http://127.0.0.1:${port}`;
  const mongo = new URL(process.env.MONGODB_URL ?? "mongodb://dev:dev@127.0.0.1:27017/sound-it-out?authSource=admin");
  mongo.pathname = `/sound_it_out_e2e_${crypto.randomUUID().replaceAll("-", "")}`;
  const server = Bun.spawn(["bun", "src/main.ts"], {
    env: { ...process.env, PORT: String(port), PUBLIC_ORIGIN: url, MONGODB_URL: mongo.toString() },
    stdout: "ignore",
    stderr: "inherit",
  });

  for (let attempt = 0; ; attempt += 1) {
    const ready = await fetch(`${url}/health`).then(response => response.ok, () => false);
    if (ready) break;
    if (attempt === 100 || server.exitCode !== null) {
      server.kill();
      throw new Error("The server for the browser journeys did not start. Is MongoDB running? See README.md.");
    }
    await Bun.sleep(100);
  }

  return {
    url,
    deployed: false,
    async stop() {
      server.kill("SIGKILL");
      await server.exited;
      const client = new MongoClient(mongo.toString());
      try { await client.db().dropDatabase(); }
      finally { await client.close(); }
    },
  };
}
