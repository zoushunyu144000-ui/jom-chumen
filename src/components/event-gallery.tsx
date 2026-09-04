import { useRef, useState, type ReactNode } from "react";
import { GALLERY_CAPTION, isGalleryImage } from "@/lib/server/event-media-parse";
import { cn } from "@/lib/utils";

export function EventGallery({
  images,
  alt,
  footer,
}: {
  images: string[];
  alt: string;
  footer?: ReactNode;
}) {
  const pics = images.filter(Boolean);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  const [portrait, setPortrait] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  if (pics.length === 0) return null;

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    setIndex(Math.min(pics.length - 1, Math.max(0, i)));
  }

  function markFailed(i: number) {
    setFailed((current) => {
      const next = new Set(current);
      next.add(i);
      return next;
    });
  }

  function onLoad(i: number, img: HTMLImageElement) {
    if (i !== 0) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w && h) setPortrait(h >= w);
  }

  return (
    <div className="relative w-full max-w-full overflow-hidden bg-ink">
      <div
        ref={scroller}
        onScroll={onScroll}
        className={cn(
          "flex w-full max-w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          portrait ? "aspect-[3/4]" : "aspect-[4/3]",
        )}
        aria-label={pics.length > 1 ? `${alt}，共 ${pics.length} 张照片，可左右滑动` : alt}
      >
        {pics.map((src, i) => (
          <div
            key={`${i}-${src.slice(0, 24)}`}
            className="flex h-full w-full shrink-0 snap-start items-center justify-center overflow-hidden bg-ink"
          >
            {failed.has(i) ? (
              <div className="flex h-full w-full items-center justify-center px-6 text-center text-xs text-surface/70">
                这张图片暂时加载失败
              </div>
            ) : (
              <img
                src={src}
                alt={i === 0 ? alt : `${alt} 第 ${i + 1} 张照片`}
                className="max-h-full max-w-full object-contain"
                draggable={false}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                onLoad={(e) => onLoad(i, e.currentTarget)}
                onError={() => markFailed(i)}
              />
            )}
          </div>
        ))}
      </div>
      {footer ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-ink via-ink/55 to-transparent px-4 pb-5 pt-16">
          {footer}
        </div>
      ) : null}
      {pics.length > 1 ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 flex justify-center gap-1.5",
            footer ? "bottom-[5.25rem]" : "bottom-3",
          )}
          aria-hidden="true"
        >
          {pics.map((_, i) => (
            <span
              key={i}
              className={`size-1.5 rounded-full shadow-sm ${i === index ? "bg-lime" : "bg-paper/80"}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function eventGalleryImages(event: {
  coverUrl?: string;
  body?: { type: string; src?: string; caption?: string }[];
}) {
  const extra = (event.body ?? [])
    .filter((block) => isGalleryImage(block) && block.src)
    .map((block) => block.src as string);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const src of [event.coverUrl ?? "", ...extra]) {
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push(src);
  }
  if (out.length === 0) {
    for (const block of event.body ?? []) {
      if (block.type === "img" && block.src && !seen.has(block.src)) {
        seen.add(block.src);
        out.push(block.src);
      }
    }
  }
  return out;
}

export { GALLERY_CAPTION };
