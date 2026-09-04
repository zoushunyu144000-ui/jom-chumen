import { createFileRoute } from "@tanstack/react-router";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readEventMedia } from "@/lib/server/event-media";
import { loadEventMetaBySlug } from "@/lib/server/event-meta";
import { makeBrandOgJpeg, normalizeOgJpeg } from "@/lib/server/og-image";

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

export const Route = createFileRoute("/api/og/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const event = await loadEventMetaBySlug(params.slug);
        if (!event) return new Response("not found", { status: 404 });
        const cover = (await readEventMedia(params.slug, "cover")) || "";
        const source = await loadCoverBytes(cover);
        let jpeg: Buffer;
        try {
          jpeg = source ? await normalizeOgJpeg(source) : await brandFallback(event.title);
        } catch {
          jpeg = await brandFallback(event.title);
        }
        return new Response(new Uint8Array(jpeg), {
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Length": String(jpeg.byteLength),
            "Cache-Control": "public, max-age=300, s-maxage=300",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});

async function loadCoverBytes(cover: string): Promise<Buffer | null> {
  if (cover.startsWith("data:image/") && !cover.startsWith("data:image/svg")) {
    const comma = cover.indexOf(",");
    if (comma < 0) return null;
    const bytes = Buffer.from(cover.slice(comma + 1), "base64");
    return bytes.byteLength <= MAX_SOURCE_BYTES ? bytes : null;
  }
  if (cover.startsWith("/covers/") || cover.startsWith("/pay/")) {
    if (cover.toLowerCase().endsWith(".svg")) return null;
    try {
      const bytes = await readFile(join(process.cwd(), "public", cover.replace(/^\//, "")));
      return bytes.byteLength <= MAX_SOURCE_BYTES ? bytes : null;
    } catch {
      return null;
    }
  }
  if (/^https?:\/\//i.test(cover)) {
    try {
      const res = await fetch(cover, { redirect: "follow" });
      const type = (res.headers.get("content-type") || "").toLowerCase();
      const length = Number(res.headers.get("content-length") || 0);
      if (!res.ok || !type.startsWith("image/") || type.includes("svg")) return null;
      if (length > MAX_SOURCE_BYTES) return null;
      const bytes = Buffer.from(await res.arrayBuffer());
      return bytes.byteLength <= MAX_SOURCE_BYTES ? bytes : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function brandFallback(title: string) {
  try {
    const bytes = await readFile(join(process.cwd(), "public", "covers", "deep-talk.jpg"));
    return await normalizeOgJpeg(bytes);
  } catch {
    return makeBrandOgJpeg(title);
  }
}
