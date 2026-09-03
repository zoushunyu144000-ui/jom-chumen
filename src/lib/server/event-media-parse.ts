import type { BodyBlock } from "@/lib/types";

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
