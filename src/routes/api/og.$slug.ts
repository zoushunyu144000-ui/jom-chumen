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
          "Cache-Control": "public, max-age=600, s-maxage=600",
          "Access-Control-Allow-Origin": "*",
        };
        if (cover.startsWith("data:image/")) {
          const comma = cover.indexOf(",");
          const meta = cover.slice(0, comma);
          const mime = meta.includes("png") ? "image/png" : meta.includes("webp") ? "image/webp" : "image/jpeg";
          return new Response(Buffer.from(cover.slice(comma + 1), "base64"), {
            headers: { ...headers, "Content-Type": mime },
          });
        }
        if (cover.startsWith("/covers/") || cover.startsWith("/pay/")) {
          try {
            const file = join(process.cwd(), "public", cover.replace(/^\//, ""));
            const bytes = await readFile(file);
            const mime = cover.endsWith(".png") ? "image/png" : cover.endsWith(".svg") ? "image/svg+xml" : "image/jpeg";
            if (mime === "image/svg+xml") return cardPng(event.title, event.price, event.currency);
            return new Response(bytes, { headers: { ...headers, "Content-Type": mime } });
          } catch {
            return cardPng(event.title, event.price, event.currency);
          }
        }
        if (cover.startsWith("http")) {
          try {
            const res = await fetch(cover);
            if (res.ok) {
              return new Response(Buffer.from(await res.arrayBuffer()), {
                headers: { ...headers, "Content-Type": res.headers.get("content-type") || "image/jpeg" },
              });
            }
          } catch {
            /* fall through */
          }
        }
        return cardPng(event.title, event.price, event.currency);
      },
    },
  },
});

function cardPng(title: string, price: number, currency: string) {
  const label = `${title.slice(0, 22)} · ${currency} ${price}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#141511"/>
    <rect x="0" y="0" width="18" height="630" fill="#c6e14a"/>
    <text x="72" y="160" fill="#c6e14a" font-size="34" font-family="Arial, sans-serif">Jom 出门局</text>
    <text x="72" y="320" fill="#ffffff" font-size="52" font-weight="700" font-family="Arial, sans-serif">${escapeXml(label)}</text>
  </svg>`;
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
