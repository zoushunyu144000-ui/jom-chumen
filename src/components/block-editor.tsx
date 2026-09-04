import { ImagePlus, Quote, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image";
import { uploadMediaObject } from "@/lib/server/storage";
import type { BodyBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

function parsePasted(raw: string): BodyBlock[] {
  const text = raw.replace(/\r/g, "").trim();
  if (!text) return [];
  const blocks: BodyBlock[] = [];
  const lines = text.split("\n");
  let list: string[] = [];
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "ul", items: list.slice(0, 12) });
      list = [];
    }
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (/^[-*•] ?/.test(trimmed) || /^·/.test(trimmed)) {
      list.push(trimmed.replace(/^[-*•·]\s*/, ""));
      continue;
    }
    flushList();
    if (/^#{1,3}\s+/.test(trimmed) || (trimmed.length <= 22 && !trimmed.endsWith("。") && !trimmed.endsWith("."))) {
      const heading = trimmed.replace(/^#{1,3}\s+/, "");
      if (heading.length <= 24 && lines.length > 1) {
        blocks.push({ type: "h", text: heading });
        continue;
      }
    }
    blocks.push({ type: "p", text: trimmed });
  }
  flushList();
  return blocks.length ? blocks : [{ type: "p", text }];
}

export function BlockEditor({
  value,
  onChange,
}: {
  value: BodyBlock[];
  onChange: (next: BodyBlock[]) => void;
}) {
  function update(i: number, block: BodyBlock) {
    onChange(value.map((item, idx) => (idx === i ? block : item)));
  }

  async function insertImage(file: File | undefined, at = value.length) {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      const stored = await uploadMediaObject({
        data: { dataUrl: compressed, fileName: file.name || "body.jpg", kind: "event-body" },
      });
      const next = [...value];
      next.splice(at, 0, { type: "img", src: stored.url, caption: "" });
      onChange(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "图片处理失败");
    }
  }

  function onPaste(e: React.ClipboardEvent, i: number) {
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    const raw = text || html.replace(/<[^>]+>/g, "\n");
    if (!raw.includes("\n") && raw.length < 80) return;
    e.preventDefault();
    const parsed = parsePasted(raw);
    const next = [...value.slice(0, i), ...parsed, ...value.slice(i + 1)];
    onChange(next.filter((block, idx, arr) => {
      if (block.type === "p" && !block.text && arr.length > 1) return idx === 0;
      return true;
    }));
    toast.success("已贴入排版");
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">可从 ChatGPT 整段复制贴进来，会识别标题、段落和列表。图可插在任一段下面并加说明。</p>
      {value.map((block, i) => (
        <div key={i} className="relative rounded-lg bg-surface p-3 shadow-card">
          <button type="button" className="absolute right-2 top-2 flex size-9 items-center justify-center text-muted" onClick={() => onChange(value.filter((_, idx) => idx !== i))} aria-label="删除">
            <Trash2 className="size-4" />
          </button>
          {block.type === "h" ? (
            <textarea value={block.text} onChange={(e) => update(i, { ...block, text: e.target.value })} onPaste={(e) => onPaste(e, i)} placeholder="小标题" rows={1} className="w-full resize-none bg-transparent pr-8 font-display text-lg font-semibold outline-none" />
          ) : null}
          {block.type === "p" ? (
            <textarea value={block.text} onChange={(e) => update(i, { ...block, text: e.target.value })} onPaste={(e) => onPaste(e, i)} placeholder="正文，可直接粘贴排版" rows={4} className="w-full resize-y bg-transparent pr-8 text-sm leading-relaxed outline-none" />
          ) : null}
          {block.type === "quote" ? (
            <textarea value={block.text} onChange={(e) => update(i, { ...block, text: e.target.value })} placeholder="引用" rows={2} className="w-full resize-none border-l-2 border-lime bg-transparent pl-3 pr-8 text-sm italic outline-none" />
          ) : null}
          {block.type === "ul" ? (
            <textarea value={block.items.join("\n")} onChange={(e) => update(i, { type: "ul", items: e.target.value.split("\n").slice(0, 12) })} placeholder={"每行一条"} rows={4} className="w-full resize-y bg-transparent pr-8 text-sm leading-relaxed outline-none" />
          ) : null}
          {block.type === "img" ? (
            <div>
              <img src={block.src} alt="" className="aspect-4/3 w-full rounded-md object-cover" />
              <input value={block.caption} onChange={(e) => update(i, { ...block, caption: e.target.value })} placeholder="图片说明（可选）" className="mt-2 w-full bg-transparent text-xs text-muted outline-none" />
            </div>
          ) : null}
          <label className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; void insertImage(file, i + 1); }} />
            在这段下面插图
          </label>
        </div>
      ))}
      <div className="grid grid-cols-4 gap-2">
        <AddBtn label="正文" onClick={() => onChange([...value, { type: "p", text: "" }])} />
        <AddBtn label="标题" icon={<Type className="size-4" />} onClick={() => onChange([...value, { type: "h", text: "" }])} />
        <AddBtn label="列表" onClick={() => onChange([...value, { type: "ul", items: [""] }])} />
        <AddBtn label="引用" icon={<Quote className="size-4" />} onClick={() => onChange([...value, { type: "quote", text: "" }])} />
      </div>
      <label className="relative flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface text-sm font-medium">
        <input type="file" accept="image/*" className="absolute inset-0 z-10 cursor-pointer opacity-0" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; void insertImage(file); }} />
        <ImagePlus className="size-4" />
        插入图片
      </label>
    </div>
  );
}

function AddBtn({ label, onClick, icon }: { label: string; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex h-10 items-center justify-center gap-1 rounded-md bg-surface text-xs font-medium shadow-card")}>
      {icon}
      {label}
    </button>
  );
}
