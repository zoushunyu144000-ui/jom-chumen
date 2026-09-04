import type { BodyBlock, RichRun } from "@/lib/types";

function Runs({ runs, fallback }: { runs?: RichRun[]; fallback: string }) {
  const content: RichRun[] = runs?.length ? runs : [{ text: fallback }];
  return <>{content.map((run, i) => {
    const node = run.bold ? <strong>{run.text}</strong> : <>{run.text}</>;
    return run.href ? <a key={i} href={run.href} target="_blank" rel="noreferrer" className="underline underline-offset-2">{node}</a> : <span key={i}>{node}</span>;
  })}</>;
}

export function EventBody({ blocks }: { blocks: BodyBlock[] }) {
  if (blocks.length === 0) return null;
  return (
    <div className="mt-2 space-y-4">
      {blocks.map((block, i) => {
        if (block.type === "h" && block.text.trim()) {
          return block.level === 1 ? <h2 key={i} className="font-display text-xl font-bold tracking-tight"><Runs runs={block.runs} fallback={block.text} /></h2> : <h3 key={i} className="font-display text-lg font-semibold tracking-tight"><Runs runs={block.runs} fallback={block.text} /></h3>;
        }
        if (block.type === "p" && block.divider) return <hr key={i} className="border-line" />;
        if (block.type === "p" && block.text.trim()) return <p key={i} className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft"><Runs runs={block.runs} fallback={block.text} /></p>;
        if (block.type === "quote" && block.text.trim()) return <blockquote key={i} className="border-l-2 border-lime pl-3 text-sm italic text-ink-soft"><Runs runs={block.runs} fallback={block.text} /></blockquote>;
        if (block.type === "ul") {
          const items = block.items.map((item) => item.trim()).filter(Boolean);
          if (!items.length) return null;
          if (block.ordered) return <ol key={i} className="list-decimal space-y-2 pl-5 text-sm text-ink-soft">{items.map((item, index) => <li key={`${index}-${item}`} className="pl-1"><Runs runs={block.richItems?.[index]} fallback={item} /></li>)}</ol>;
          return <ul key={i} className="space-y-2">{items.map((item, index) => <li key={`${index}-${item}`} className="flex gap-2 text-sm text-ink-soft before:mt-2 before:size-1.5 before:shrink-0 before:rounded-full before:bg-lime before:content-['']"><Runs runs={block.richItems?.[index]} fallback={item} /></li>)}</ul>;
        }
        if (block.type === "img" && block.src) return <figure key={i}><img src={block.src} alt={block.caption || ""} className="w-full rounded-lg object-cover" />{block.caption ? <figcaption className="mt-1 text-center text-xs text-muted">{block.caption}</figcaption> : null}</figure>;
        return null;
      })}
    </div>
  );
}
