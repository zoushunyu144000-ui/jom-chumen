import { getSql } from "@/lib/db";
import { parseBodySafe } from "@/lib/server/event-media-parse";

export async function readEventMedia(slug: string, kind: string, n = 0) {
  const sql = await getSql();
  const rows = await sql.query<{
    cover_url: string;
    body: string | null;
    wechat_qr: string | null;
    alipay_qr: string | null;
    tng_qr: string | null;
    title: string;
  }>(
    `select cover_url, body, wechat_qr, alipay_qr, tng_qr, title from events where slug = $1 limit 1`,
    [slug],
  );
  const row = rows[0];
  if (!row) return null;
  if (kind === "cover") return row.cover_url || null;
  if (kind === "wechat") return row.wechat_qr || null;
  if (kind === "alipay") return row.alipay_qr || null;
  if (kind === "tng") return row.tng_qr || null;
  const imgs = parseBodySafe(row.body).filter((b) => b.type === "img" && b.src);
  return imgs[n]?.src ?? null;
}

export function publicMediaUrl(slug: string, kind: string, n = 0) {
  if (kind === "img") return `/api/media/${slug}?kind=img&n=${n}`;
  return `/api/media/${slug}?kind=${kind}`;
}
