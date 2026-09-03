import { createFileRoute } from "@tanstack/react-router";
import { getEventBySlug } from "@/lib/server/events";
import { formatPrice, formatRange } from "@/lib/format";
import { publicSiteUrl } from "@/lib/public-url";

export const Route = createFileRoute("/api/og/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const event = await getEventBySlug({ data: { slug: params.slug } });
        if (!event) return new Response("not found", { status: 404 });
        const cover = event.coverUrl || "";
        if (cover.startsWith("data:image/")) {
          const comma = cover.indexOf(",");
          const meta = cover.slice(0, comma);
          const data = cover.slice(comma + 1);
          const mime = meta.includes("png") ? "image/png" : meta.includes("webp") ? "image/webp" : "image/jpeg";
          const bytes = Buffer.from(data, "base64");
          return new Response(bytes, {
            headers: {
              "Content-Type": mime,
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
        if (cover.startsWith("http")) {
          return Response.redirect(cover, 302);
        }
        if (cover.startsWith("/")) {
          return Response.redirect(`${publicSiteUrl()}${cover}`, 302);
        }
        const price = formatPrice(event.price, event.currency);
        const when = formatRange(event.startsAt, event.endsAt, event.currency);
        const title = escapeXml(event.title.slice(0, 28));
        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#111111"/>
  <rect x="48" y="48" width="16" height="534" fill="#c6e14a"/>
  <text x="92" y="140" fill="#c6e14a" font-size="28" font-family="sans-serif">Jom 出门局</text>
  <text x="92" y="250" fill="#ffffff" font-size="56" font-weight="700" font-family="sans-serif">${title}</text>
  <text x="92" y="340" fill="#dddddd" font-size="28" font-family="sans-serif">${escapeXml(when)}</text>
  <text x="92" y="400" fill="#dddddd" font-size="28" font-family="sans-serif">${escapeXml(event.venue)} · ${escapeXml(price)}</text>
</svg>`;
        return new Response(svg, {
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
