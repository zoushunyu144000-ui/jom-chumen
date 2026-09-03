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
  const scroller = useRef<HTMLDivElement>(null);
  if (pics.length === 0) return null;

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    setIndex(Math.min(pics.length - 1, Math.max(0, i)));
  }

  return (
    <div className="relative">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex aspect-4/3 snap-x snap-mandatory overflow-x-auto bg-paper-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pics.map((src, i) => (
          <img
            key={`${i}-${src.slice(0, 24)}`}
            src={src}
            alt={i === 0 ? alt : ""}
            className="h-full w-full shrink-0 snap-center object-cover"
            draggable={false}
          />
        ))}
      </div>
      {pics.length > 1 ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {pics.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full ${i === index ? "w-4 bg-lime" : "w-1.5 bg-paper/80"}`} />
            ))}
          </div>
          <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] text-lime">
            {index + 1}/{pics.length}
          </span>
        </>
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
