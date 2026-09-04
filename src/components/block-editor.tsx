import { ImagePlus, Minus, Quote, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image";
import { uploadMediaObject } from "@/lib/server/storage";
import type { BodyBlock, RichRun } from "@/lib/types";
import { cn } from "@/lib/utils";

function safeHref(raw: string) {
  try {
    const url = new URL(raw, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function compactRuns(runs: RichRun[]) {
  const out: RichRun[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const last = out[out.length - 1];
    if (last && last.bold === run.bold && last.href === run.href) last.text += run.text;
    else out.push(run);
  }
  return out;
}

function parseInlineMarkdown(text: string): RichRun[] {
  const runs: RichRun[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let at = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > at) runs.push({ text: text.slice(at, index) });
    const token = match[0];
    if (token.startsWith("**")) runs.push({ text: token.slice(2, -2), bold: true });
    else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      const href = link ? safeHref(link[2]) : "";
      runs.push({ text: link?.[1] || token, ...(href ? { href } : {}) });
    }
    at = index + token.length;
  }
  if (at < text.length) runs.push({ text: text.slice(at) });
  return compactRuns(runs.length ? runs : [{ text }]);
}

function textOf(runs: RichRun[]) {
  return runs.map((run) => run.text).join("");
}

function parseMarkdown(raw: string): BodyBlock[] {
  const lines = raw.replace(/\r/g, "").trim().split("\n");
  const blocks: BodyBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i += 1; continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      blocks.push({ type: "p", text: "---", divider: true }); i += 1; continue;
    }
    const heading = /^(#{1,2})\s+(.+)$/.exec(line);
    if (heading) {
      const runs = parseInlineMarkdown(heading[2]);
      blocks.push({ type: "h", text: textOf(runs), level: heading[1].length as 1 | 2, runs }); i += 1; continue;
    }
    if (/^>\s?/.test(line)) {
      const runs = parseInlineMarkdown(line.replace(/^>\s?/, ""));
      blocks.push({ type: "quote", text: textOf(runs), runs }); i += 1; continue;
    }
    const ordered = /^\d+[.)]\s+/.test(line);
    const unordered = /^[-*+]\s+/.test(line);
    if (ordered || unordered) {
      const richItems: RichRun[][] = [];
      const matcher = ordered ? /^\d+[.)]\s+/ : /^[-*+]\s+/;
      while (i < lines.length && matcher.test(lines[i].trim())) {
        richItems.push(parseInlineMarkdown(lines[i].trim().replace(matcher, ""))); i += 1;
      }
      blocks.push({ type: "ul", ordered, items: richItems.map(textOf), richItems });
      continue;
    }
    const runs = parseInlineMarkdown(line);
    blocks.push({ type: "p", text: textOf(runs), runs }); i += 1;
  }
  return blocks.length ? blocks : [{ type: "p", text: "" }];
}

function htmlRuns(node: Node, inherited: Pick<RichRun, "bold" | "href"> = {}): RichRun[] {
  if (node.nodeType === Node.TEXT_NODE) return [{ text: node.textContent || "", ...inherited }];
  if (!(node instanceof HTMLElement)) return [];
  const tag = node.tagName.toLowerCase();
  if (["script", "style", "iframe", "object", "embed"].includes(tag)) return [];
  const bold = inherited.bold || tag === "strong" || tag === "b";
  const candidateHref = tag === "a" ? safeHref(node.getAttribute("href") || "") : inherited.href;
  return compactRuns(Array.from(node.childNodes).flatMap((child) => htmlRuns(child, { bold, ...(candidateHref ? { href: candidateHref } : {}) })));
}

function parseHtml(raw: string): BodyBlock[] {
  const doc = new DOMParser().parseFromString(raw, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed").forEach((node) => node.remove());
  const blocks: BodyBlock[] = [];
  const pushText = (type: "p" | "quote" | "h", el: HTMLElement, level?: 1 | 2) => {
    const runs = compactRuns(htmlRuns(el));
    const text = textOf(runs).trim();
    if (!text) return;
    if (type === "h") blocks.push({ type, text, runs, level });
    else blocks.push({ type, text, runs });
  };
  const visit = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "h1" || tag === "h2") return pushText("h", el as HTMLElement, tag === "h1" ? 1 : 2);
    if (tag === "p") return pushText("p", el as HTMLElement);
    if (tag === "blockquote") return pushText("quote", el as HTMLElement);
    if (tag === "hr") { blocks.push({ type: "p", text: "---", divider: true }); return; }
    if (tag === "ul" || tag === "ol") {
      const richItems = Array.from(el.children).filter((child) => child.tagName.toLowerCase() === "li").map((li) => compactRuns(htmlRuns(li)));
      if (richItems.length) blocks.push({ type: "ul", ordered: tag === "ol", items: richItems.map(textOf), richItems });
      return;
    }
    if (tag === "figure") {
      const img = el.querySelector("img");
      const src = img?.getAttribute("src") || "";
      if (/^https?:\/\//i.test(src)) blocks.push({ type: "img", src, caption: el.querySelector("figcaption")?.textContent?.trim() || img?.getAttribute("alt") || "" });
      return;
    }
    if (tag === "img") {
      const src = el.getAttribute("src") || "";
      if (/^https?:\/\//i.test(src)) blocks.push({ type: "img", src, caption: el.getAttribute("alt") || "" });
      return;
    }
    const children = Array.from(el.children).filter((child) => /^(h1|h2|p|blockquote|ul|ol|hr|figure|img|div)$/i.test(child.tagName));
    if (children.length) children.forEach(visit);
    else if (el.textContent?.trim()) pushText("p", el as HTMLElement);
  };
  Array.from(doc.body.children).forEach(visit);
  return blocks.length ? blocks : parseMarkdown(doc.body.textContent || "");
}

function RichPreview({ runs }: { runs?: RichRun[] }) {
  if (!runs?.some((run) => run.bold || run.href)) return null;
  return <p className="mt-2 rounded bg-paper-2 px-2 py-1.5 text-xs text-ink-soft">预览：{runs.map((run, i) => run.href ? <a key={i} href={run.href} target="_blank" rel="noreferrer" className="underline">{run.bold ? <strong>{run.text}</strong> : run.text}</a> : run.bold ? <strong key={i}>{run.text}</strong> : <span key={i}>{run.text}</span>)}</p>;
}

export function BlockEditor({ value, onChange }: { value: BodyBlock[]; onChange: (next: BodyBlock[]) => void }) {
  const update = (i: number, block: BodyBlock) => onChange(value.map((item, idx) => idx === i ? block : item));

  async function insertImage(file: File | undefined, at = value.length) {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      const stored = await uploadMediaObject({ data: { dataUrl: compressed, fileName: file.name || "body.jpg", kind: "event-body" } });
      const next = [...value]; next.splice(at, 0, { type: "img", src: stored.url, caption: "" }); onChange(next);
    } catch (err) { toast.error(err instanceof Error ? err.message : "图片处理失败"); }
  }

  function onPaste(e: React.ClipboardEvent, i: number) {
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    if (!html && !text.includes("\n") && text.length < 80) return;
    e.preventDefault();
    const parsed = html ? parseHtml(html) : parseMarkdown(text);
    onChange([...value.slice(0, i), ...parsed, ...value.slice(i + 1)]);
    toast.success("已按结构贴入");
  }

  return <div className="space-y-3">
    <p className="text-xs text-muted">支持 Markdown 和 ChatGPT / Claude / Gemini 复制的排版；只保存安全的结构化内容，不保存原始 HTML。</p>
    {value.map((block, i) => <div key={i} className="relative rounded-lg bg-surface p-3 shadow-card">
      <button type="button" className="absolute right-2 top-2 flex size-9 items-center justify-center text-muted" onClick={() => onChange(value.filter((_, idx) => idx !== i))} aria-label="删除"><Trash2 className="size-4" /></button>
      {block.type === "h" ? <><select value={block.level ?? 2} onChange={(e) => update(i, { ...block, level: Number(e.target.value) as 1 | 2 })} className="mb-2 bg-transparent text-xs text-muted"><option value="1">一级标题</option><option value="2">二级标题</option></select><textarea value={block.text} onChange={(e) => update(i, { ...block, text: e.target.value, runs: undefined })} onPaste={(e) => onPaste(e, i)} rows={1} className="w-full resize-none bg-transparent pr-8 font-display text-lg font-semibold outline-none" /><RichPreview runs={block.runs} /></> : null}
      {block.type === "p" && block.divider ? <div className="py-5"><hr className="border-line" /></div> : null}
      {block.type === "p" && !block.divider ? <><textarea value={block.text} onChange={(e) => update(i, { ...block, text: e.target.value, runs: undefined })} onPaste={(e) => onPaste(e, i)} placeholder="正文，可直接粘贴排版" rows={4} className="w-full resize-y bg-transparent pr-8 text-sm leading-relaxed outline-none" /><RichPreview runs={block.runs} /></> : null}
      {block.type === "quote" ? <><textarea value={block.text} onChange={(e) => update(i, { ...block, text: e.target.value, runs: undefined })} onPaste={(e) => onPaste(e, i)} rows={2} className="w-full resize-none border-l-2 border-lime bg-transparent pl-3 pr-8 text-sm italic outline-none" /><RichPreview runs={block.runs} /></> : null}
      {block.type === "ul" ? <textarea value={block.items.join("\n")} onChange={(e) => update(i, { type: "ul", ordered: block.ordered, items: e.target.value.split("\n").slice(0, 20) })} onPaste={(e) => onPaste(e, i)} placeholder="每行一条" rows={4} className="w-full resize-y bg-transparent pr-8 text-sm leading-relaxed outline-none" /> : null}
      {block.type === "img" ? <div><img src={block.src} alt="" className="aspect-4/3 w-full rounded-md object-cover" /><input value={block.caption} onChange={(e) => update(i, { ...block, caption: e.target.value })} placeholder="图片说明（可选）" className="mt-2 w-full bg-transparent text-xs text-muted outline-none" /></div> : null}
      {!(block.type === "p" && block.divider) ? <label className="mt-2 inline-flex items-center gap-1 text-xs text-muted"><input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; void insertImage(file, i + 1); }} />在这段下面插图</label> : null}
    </div>)}
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      <AddBtn label="正文" onClick={() => onChange([...value, { type: "p", text: "" }])} />
      <AddBtn label="标题" icon={<Type className="size-4" />} onClick={() => onChange([...value, { type: "h", level: 2, text: "" }])} />
      <AddBtn label="无序" onClick={() => onChange([...value, { type: "ul", items: [""] }])} />
      <AddBtn label="有序" onClick={() => onChange([...value, { type: "ul", ordered: true, items: [""] }])} />
      <AddBtn label="引用" icon={<Quote className="size-4" />} onClick={() => onChange([...value, { type: "quote", text: "" }])} />
      <AddBtn label="分隔" icon={<Minus className="size-4" />} onClick={() => onChange([...value, { type: "p", text: "---", divider: true }])} />
    </div>
    <label className="relative flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface text-sm font-medium"><input type="file" accept="image/*" className="absolute inset-0 z-10 cursor-pointer opacity-0" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; void insertImage(file); }} /><ImagePlus className="size-4" />插入图片</label>
  </div>;
}

function AddBtn({ label, onClick, icon }: { label: string; onClick: () => void; icon?: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("flex h-10 items-center justify-center gap-1 rounded-md bg-surface text-xs font-medium shadow-card")}>{icon}{label}</button>;
}
