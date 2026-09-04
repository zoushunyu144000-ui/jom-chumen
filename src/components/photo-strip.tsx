import { useRef, useState } from "react";
import { ImagePlus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image";
import { uploadMediaObject } from "@/lib/server/storage";

const MAX_PHOTOS = 8;

export function PhotoStrip({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (next: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function addFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`最多 ${MAX_PHOTOS} 张`);
      return;
    }
    setBusy(true);
    const next = [...photos];
    try {
      const list = Array.from(files).slice(0, room);
      for (const file of list) {
        const compressed = await compressImage(file, {
          maxEdge: 1100,
          quality: 0.72,
          format: "jpeg",
          maxChars: 220_000,
        });
        const stored = await uploadMediaObject({
          data: { dataUrl: compressed, fileName: file.name || "event.jpg", kind: "event-gallery" },
        });
        next.push(stored.url);
      }
      onChange(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "图片处理失败");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
    onChange(next);
  }

  return (
    <div>
      <p className="text-xs text-muted">
        可一次选多张。第一张是封面，按左右箭头调顺序。
      </p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((src, i) => (
          <div key={`${i}-${src.slice(-12)}`} className="relative w-24 shrink-0">
            <img src={src} alt="" className="aspect-[3/4] w-24 rounded-lg object-cover" />
            <span className="absolute left-1 top-1 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] text-lime">
              {i === 0 ? "封面" : `第 ${i + 1} 张`}
            </span>
            <div className="mt-1 flex justify-between">
              <button type="button" className="flex size-7 items-center justify-center rounded-full bg-surface" onClick={() => move(i, -1)} aria-label="前移">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" className="flex size-7 items-center justify-center rounded-full bg-surface text-danger" onClick={() => onChange(photos.filter((_, j) => j !== i))} aria-label="删除">
                <Trash2 className="size-3.5" />
              </button>
              <button type="button" className="flex size-7 items-center justify-center rounded-full bg-surface" onClick={() => move(i, 1)} aria-label="后移">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <label className="flex aspect-[3/4] w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-surface text-xs text-muted">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={busy}
              onChange={(e) => void addFiles(e.target.files)}
            />
            <ImagePlus className="size-5" />
            {busy ? "处理中…" : "加图"}
          </label>
        ) : null}
      </div>
    </div>
  );
}
