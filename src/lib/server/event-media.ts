import { getSql } from "@/lib/db";
import { isGalleryImage, parseBodySafe, parseMediaProxy } from "@/lib/server/event-media-parse";
import type { BodyBlock } from "@/lib/types";

export async function readEventMedia(slug: string, kind: string, n = 0) {
  const sql = await getSql();
  if (kind === "cover") {
    const rows = await sql.query<{ cover_url: string }>(`select cover_url from events where slug = $1 limit 1`, [slug]);
    return rows[0]?.cover_url || null;
  }
  if (kind === "wechat" || kind === "alipay" || kind === "tng") {
    const col = kind === "wechat" ? "wechat_qr" : kind === "alipay" ? "alipay_qr" : "tng_qr";
    const rows = await sql.query<Record<string, string | null>>(`select ${col} as src from events where slug = $1 limit 1`, [slug]);
    return rows[0]?.src || null;
  }
  const rows = await sql.query<{ body: string | null }>(`select body from events where slug = $1 limit 1`, [slug]);
  const imgs = parseBodySafe(rows[0]?.body).filter(
    (b): b is Extract<BodyBlock, { type: "img" }> => b.type === "img" && Boolean(b.src),
  );
  if (kind === "gallery") return imgs.filter((b) => isGalleryImage(b))[n]?.src ?? null;
  if (kind === "bodyimg") return imgs.filter((b) => !isGalleryImage(b))[n]?.src ?? null;
  return imgs[n]?.src ?? null;
}

export async function resolveMediaSrc(src: string) {
  const parsed = parseMediaProxy(src);
  if (!parsed) return src;
  const real = await readEventMedia(parsed.slug, parsed.kind, parsed.n);
  return real || src;
}
