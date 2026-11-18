import { MongoClient } from "mongodb";

export async function isolatedDatabase() {
  const url = process.env.MONGODB_URL ?? "mongodb://dev:dev@127.0.0.1:27017/sound-it-out?authSource=admin";
  const client = new MongoClient(url, { serverSelectionTimeoutMS: 3000 });
  const db = client.db(`sound_it_out_test_${crypto.randomUUID().replaceAll("-", "")}`);
  try {
    await db.command({ ping: 1 });
  } catch (error) {
    await client.close();
    throw new Error("Tests need a local MongoDB that can create isolated databases. See README.md.", { cause: error });
  }
  return {
    db,
    async close() {
      try { await db.dropDatabase(); }
      finally { await client.close(); }
    },
  };
}
