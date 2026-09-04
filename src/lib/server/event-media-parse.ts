import type { BodyBlock } from "@/lib/types";

export const GALLERY_CAPTION = "__gallery__";

export function isGalleryImage(block: { type?: string; caption?: string } | null | undefined) {
  if (!block || block.type !== "img") return false;
  return block.caption === GALLERY_CAPTION || block.caption === "gallery";
}

export function countGallery(body: { type?: string; caption?: string }[] | null | undefined) {
  return (body ?? []).filter(isGalleryImage).length;
}

export function parseBodySafe(raw: string | null | undefined): BodyBlock[] {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((block): block is BodyBlock => {
      if (!block || typeof block !== "object") return false;
      const type = (block as BodyBlock).type;
      return type === "h" || type === "p" || type === "quote" || type === "ul" || type === "img";
    });
  } catch {
    return [];
  }
}

export function rewriteEventMedia<T extends { slug: string; coverUrl: string; body: { type: string; src?: string; caption?: string; text?: string; items?: string[] }[] }>(event: T): T {
  let n = 0;
  const body = event.body.map((block) => {
    if (block.type !== "img" || !block.src) return block;
    const src = `/api/media/${event.slug}?kind=img&n=${n}`;
    n += 1;
    return { ...block, src };
  });
  return {
    ...event,
    coverUrl: `/api/media/${event.slug}?kind=cover`,
    body,
  };
}

export function parseMediaProxy(src: string): { slug: string; kind: string; n: number } | null {
  const match = /^\/api\/media\/([^/?#]+)(?:\?([^#]*))?/.exec(src);
  if (!match) return null;
  const params = new URLSearchParams(match[2] || "");
  return {
    slug: decodeURIComponent(match[1]),
    kind: params.get("kind") || "cover",
    n: Number(params.get("n") || "0") || 0,
  };
}
