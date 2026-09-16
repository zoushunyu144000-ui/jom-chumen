import type { BodyBlock } from "@/lib/types";

export function EventBody({ blocks }: { blocks: BodyBlock[] }) {
  if (blocks.length === 0) return null;
  return (
    <div className="mt-2 space-y-4">
      {blocks.map((block, i) => {
        if (block.type === "h" && block.text.trim()) {
          return (
            <h3
              key={i}
              className="font-display text-lg font-semibold tracking-tight"
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === "p" && block.text.trim()) {
          return (
            <p key={i} className="text-[15px] leading-relaxed text-ink-soft whitespace-pre-wrap">
              {block.text}
            </p>
          );
        }
        if (block.type === "quote" && block.text.trim()) {
          return (
            <blockquote
              key={i}
              className="border-l-2 border-lime pl-3 text-sm italic text-ink-soft"
            >
              {block.text}
            </blockquote>
          );
        }
        if (block.type === "ul") {
          const items = block.items.map((item) => item.trim()).filter(Boolean);
          if (items.length === 0) return null;
          return (
            <ul key={i} className="space-y-2">
              {items.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-sm text-ink-soft before:mt-2 before:size-1.5 before:shrink-0 before:rounded-full before:bg-lime before:content-['']"
                >
                  {item}
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "img" && block.src) {
          return (
            <figure key={i}>
              <img
                src={block.src}
                alt={block.caption || ""}
                className="w-full rounded-lg object-cover"
              />
              {block.caption ? (
                <figcaption className="mt-1 text-center text-xs text-muted">
                  {block.caption}
                </figcaption>
              ) : null}
            </figure>
          );
        }
        return null;
      })}
    </div>
  );
}
