import { createFileRoute } from "@tanstack/react-router";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readEventMedia } from "@/lib/server/event-media";
import { loadEventMetaBySlug } from "@/lib/server/event-meta";

export const Route = createFileRoute("/api/og/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const event = await loadEventMetaBySlug(params.slug);
        if (!event) return new Response("not found", { status: 404 });
        const cover = (await readEventMedia(params.slug, "cover")) || "";
        const headers = {
          "Cache-Control": "public, max-age=300, s-maxage=300",
          "Access-Control-Allow-Origin": "*",
        };
        if (cover.startsWith("data:image/") && !cover.startsWith("data:image/svg")) {
          const comma = cover.indexOf(",");
          const meta = cover.slice(0, comma);
          const mime = meta.includes("png") ? "image/png" : meta.includes("webp") ? "image/webp" : "image/jpeg";
          return new Response(Buffer.from(cover.slice(comma + 1), "base64"), {
            headers: { ...headers, "Content-Type": mime },
          });
        }
        if (cover.startsWith("/covers/") || cover.startsWith("/pay/")) {
          if (cover.endsWith(".svg")) return await brandJpeg(event.title);
          try {
            const file = join(process.cwd(), "public", cover.replace(/^\//, ""));
            const bytes = await readFile(file);
            const mime = cover.endsWith(".png") ? "image/png" : "image/jpeg";
            return new Response(bytes, { headers: { ...headers, "Content-Type": mime } });
          } catch {
            return await brandJpeg(event.title);
          }
        }
        if (cover.startsWith("http")) {
          try {
            const res = await fetch(cover);
            const type = res.headers.get("content-type") || "";
            if (res.ok && type.includes("image") && !type.includes("svg")) {
              return new Response(Buffer.from(await res.arrayBuffer()), {
                headers: { ...headers, "Content-Type": type },
              });
            }
          } catch {
            /* fall through */
          }
        }
        return await brandJpeg(event.title);
      },
    },
  },
});

function brandJpeg(title: string) {
  const file = join(process.cwd(), "public", "covers", "deep-talk.jpg");
  return readFile(file)
    .then((bytes) => new Response(bytes, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    }))
    .catch(() => {
      const label = `Jom ${title}`.slice(0, 28);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f4f3ee"/><text x="72" y="320" fill="#141511" font-size="48">${label.replaceAll("&", "").replaceAll("<", "")}</text></svg>`;
      return new Response(Buffer.from(svg), {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
      });
    });
}
