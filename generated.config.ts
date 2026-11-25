import { httpWire } from "@mit-sdg/sync-engine-http/tooling";
import { MongoClient } from "mongodb";
import { assembleApplication, createInstances } from "./src/assembly.ts";
import { soundItOutPolicy } from "./src/http.ts";

// Generation only inspects declarations. This client never connects.
const toolingDb = new MongoClient("mongodb://127.0.0.1:27017/sound-it-out-artifacts").db();

export default {
  assemble: () => assembleApplication(createInstances(toolingDb)),
  title: "Sound It Out",
  wireName: "SoundItOutWire",
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/Accounts.md", import.meta.url),
      new URL("./design/compositions/Commons.md", import.meta.url),
      new URL("./design/compositions/SoundWall.md", import.meta.url),
      new URL("./design/compositions/Suggestions.md", import.meta.url),
      new URL("./design/compositions/Friends.md", import.meta.url),
    ],
  },
  projections: [httpWire({ policy: soundItOutPolicy("http://127.0.0.1:3000"), name: "SoundItOutWireHttp" })],
};
