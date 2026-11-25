import { COMMONS_CALLBACK_PATH } from "../shared/commons.ts";

export async function buildFrontend() {
  const build = await Bun.build({
    entrypoints: [new URL("./index.html", import.meta.url).pathname],
    target: "browser",
    publicPath: "/",
    minify: process.env.NODE_ENV === "production",
  });
  if (!build.success) throw new Error("Could not build the frontend.", { cause: build.logs });

  const files = new Map(build.outputs.map(file => ["/" + file.path.replace(/^\.\//, ""), file]));
  const homepage = files.get("/index.html");
  if (!homepage) throw new Error("The frontend bundle is missing its entry page.");

  return (request: Request) => {
    const path = new URL(request.url).pathname;
    // The only frame the app embeds is SoundCloud's player, so no other origin may be framed.
    const headers = {
      "Content-Security-Policy": "frame-src https://w.soundcloud.com",
      "Referrer-Policy": path === COMMONS_CALLBACK_PATH ? "no-referrer" : "same-origin",
      "X-Content-Type-Options": "nosniff",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { ...headers, Allow: "GET, HEAD" } });
    }
    const file = path === "/" || path === COMMONS_CALLBACK_PATH ? homepage : files.get(path);
    if (!file) return new Response("Page not found", { status: 404, headers });

    return new Response(request.method === "HEAD" ? null : file, {
      headers: {
        ...headers,
        "Content-Type": file.type,
        "Cache-Control": file === homepage ? "no-store" : "no-cache",
      },
    });
  };
}
