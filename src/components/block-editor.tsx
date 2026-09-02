import { ImagePlus, Quote, Trash2, Type } from "lucide-react";
import { compressImage } from "@/lib/image";
import type { BodyBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

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

  async function addImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const src = await compressImage(file);
      onChange([...value, { type: "img", src, caption: "" }]);
    };
    input.click();
  }

  return (
    <div className="space-y-3">
      {value.map((block, i) => (
        <div key={i} className="relative rounded-lg bg-surface p-3 shadow-card">
          <button
            type="button"
            className="absolute right-2 top-2 flex size-9 items-center justify-center text-muted"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            aria-label="删除"
          >
            <Trash2 className="size-4" />
          </button>
          {block.type === "h" ? (
            <textarea
              value={block.text}
              onChange={(e) => update(i, { ...block, text: e.target.value })}
              placeholder="小标题"
              rows={1}
              className="w-full resize-none bg-transparent pr-8 font-display text-lg font-semibold outline-none"
            />
          ) : null}
          {block.type === "p" ? (
            <textarea
              value={block.text}
              onChange={(e) => update(i, { ...block, text: e.target.value })}
              placeholder="正文"
              rows={4}
              className="w-full resize-y bg-transparent pr-8 text-sm leading-relaxed outline-none"
            />
          ) : null}
          {block.type === "quote" ? (
            <textarea
              value={block.text}
              onChange={(e) => update(i, { ...block, text: e.target.value })}
              placeholder="引用 / 发起人说"
              rows={2}
              className="w-full resize-none border-l-2 border-lime bg-transparent pl-3 pr-8 text-sm italic outline-none"
            />
          ) : null}
          {block.type === "ul" ? (
            <textarea
              value={block.items.join("\n")}
              onChange={(e) =>
                update(i, {
                  type: "ul",
                  items: e.target.value.split("\n").slice(0, 12),
                })
              }
              placeholder={"每行一条\n带运动鞋\n自备水杯"}
              rows={4}
              className="w-full resize-y bg-transparent pr-8 text-sm leading-relaxed outline-none"
            />
          ) : null}
          {block.type === "img" ? (
            <div>
              <img
                src={block.src}
                alt=""
                className="aspect-4/3 w-full rounded-md object-cover"
              />
              <input
                value={block.caption}
                onChange={(e) =>
                  update(i, { ...block, caption: e.target.value })
                }
                placeholder="图片说明（可选）"
                className="mt-2 w-full bg-transparent text-xs text-muted outline-none"
              />
            </div>
          ) : null}
        </div>
      ))}

      <div className="grid grid-cols-4 gap-2">
        <AddBtn
          label="正文"
          onClick={() => onChange([...value, { type: "p", text: "" }])}
        />
        <AddBtn
          label="标题"
          icon={<Type className="size-4" />}
          onClick={() => onChange([...value, { type: "h", text: "" }])}
        />
        <AddBtn
          label="列表"
          onClick={() => onChange([...value, { type: "ul", items: [""] }])}
        />
        <AddBtn
          label="引用"
          icon={<Quote className="size-4" />}
          onClick={() => onChange([...value, { type: "quote", text: "" }])}
        />
      </div>
      <button
        type="button"
        onClick={() => void addImage()}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface text-sm font-medium"
      >
        <ImagePlus className="size-4" />
        插入图片
      </button>
    </div>
  );
}

function AddBtn({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center gap-1 rounded-md bg-surface text-xs font-medium shadow-card",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
