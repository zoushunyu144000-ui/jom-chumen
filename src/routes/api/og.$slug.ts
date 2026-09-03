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
          if (cover.endsWith(".svg")) return brandJpeg(event.title);
          try {
            const file = join(process.cwd(), "public", cover.replace(/^\//, ""));
            const bytes = await readFile(file);
            const mime = cover.endsWith(".png") ? "image/png" : "image/jpeg";
            return new Response(bytes, { headers: { ...headers, "Content-Type": mime } });
          } catch {
            return brandJpeg(event.title);
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
        return brandJpeg(event.title);
      },
    },
  },
});

function brandJpeg(title: string) {
  const label = `Jom ${title}`.slice(0, 28);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#141511"/>
    <rect width="1200" height="18" fill="#c6e14a"/>
    <text x="72" y="200" fill="#c6e14a" font-size="40" font-family="Arial">Jom 出门局</text>
    <text x="72" y="340" fill="#f4f1ea" font-size="48" font-family="Arial">${label.replaceAll("&", "").replaceAll("<", "")}</text>
  </svg>`;
  return new Response(Buffer.from(svg), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}
