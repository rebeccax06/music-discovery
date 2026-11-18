import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { SoundItOutWireHttp } from "../generated/wire.ts";

export const api = createHttpClient<SoundItOutWireHttp>({ baseUrl: "/api", credentials: "same-origin" });
