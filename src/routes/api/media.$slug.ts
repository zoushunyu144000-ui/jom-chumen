import { createFileRoute } from "@tanstack/react-router";
import { readEventMedia } from "@/lib/server/event-media";

export const Route = createFileRoute("/api/media/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const kind = url.searchParams.get("kind") || "cover";
        const n = Number(url.searchParams.get("n") || "0") || 0;
        const src = await readEventMedia(params.slug, kind, n);
        if (!src) return new Response("not found", { status: 404 });
        if (src.startsWith("data:image/")) {
          const comma = src.indexOf(",");
          const meta = src.slice(5, comma);
          const mime = meta.startsWith("image/png")
            ? "image/png"
            : meta.startsWith("image/webp")
              ? "image/webp"
              : "image/jpeg";
          const bytes = Buffer.from(src.slice(comma + 1), "base64");
          return new Response(bytes, {
            headers: {
              "Content-Type": mime,
              "Cache-Control": "public, max-age=86400",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
        if (src.startsWith("http")) return Response.redirect(src, 302);
        if (src.startsWith("/")) {
          const origin = new URL(request.url).origin;
          return Response.redirect(`${origin}${src}`, 302);
        }
        return new Response("bad image", { status: 404 });
      },
    },
  },
});
