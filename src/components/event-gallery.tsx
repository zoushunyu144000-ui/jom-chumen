import { useRef, useState } from "react";
import { GALLERY_CAPTION } from "@/components/event-form";

export function EventGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const pics = images.filter(Boolean);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
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

  return (
    <div className="relative w-full max-w-full overflow-hidden bg-paper-2">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex aspect-4/3 w-full max-w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-paper-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={pics.length > 1 ? `${alt}，共 ${pics.length} 张照片，可左右滑动` : alt}
      >
        {pics.map((src, i) => (
          <div
            key={`${i}-${src.slice(0, 24)}`}
            className="flex h-full w-full shrink-0 snap-start items-center justify-center overflow-hidden bg-paper-2"
          >
            {failed.has(i) ? (
              <div className="flex h-full w-full items-center justify-center px-6 text-center text-xs text-muted">
                这张图片暂时加载失败
              </div>
            ) : (
              <img
                src={src}
                alt={i === 0 ? alt : `${alt} 第 ${i + 1} 张照片`}
                className="h-full w-full object-cover"
                draggable={false}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                onError={() => markFailed(i)}
              />
            )}
          </div>
        ))}
      </div>
      {pics.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
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
    .filter((block) => block.type === "img" && block.src && block.caption === GALLERY_CAPTION)
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
