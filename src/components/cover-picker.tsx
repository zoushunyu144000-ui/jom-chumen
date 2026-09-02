import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image";
import { cn } from "@/lib/utils";

export function CoverPicker({
  value,
  onChange,
  label = "封面图",
  variant = "cover",
  hint,
}: {
  value: string;
  onChange: (src: string) => void;
  label?: string;
  variant?: "cover" | "avatar" | "qr";
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const src = await compressImage(file, {
        maxEdge: variant === "avatar" ? 640 : variant === "qr" ? 520 : 1400,
        quality: variant === "qr" ? 1 : 0.84,
        format: variant === "qr" ? "png" : "jpeg",
        maxChars: variant === "qr" ? 480_000 : 900_000,
      });
      onChange(src);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "图片处理失败，请先截图再上传");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="absolute inset-0 z-10 cursor-pointer opacity-0"
      aria-label={label}
      disabled={busy}
      onChange={(e) => void onFile(e.target.files?.[0])}
    />
  );

  if (variant === "avatar") {
    return (
      <div className="mx-auto w-fit">
        <label className="relative mx-auto block size-28 overflow-hidden rounded-full bg-paper-2 shadow-card">
          {input}
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-sm text-muted">
              {busy ? "处理中…" : label}
            </span>
          )}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex h-8 items-center justify-center bg-ink/70 text-lime">
            <Camera className="size-4" />
          </span>
        </label>
      </div>
    );
  }

  if (variant === "qr") {
    return (
      <label className="relative flex min-h-24 items-center gap-3 overflow-hidden rounded-xl bg-surface p-3 shadow-card">
        {input}
        <span className="size-20 shrink-0 overflow-hidden rounded-lg bg-paper-2">
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-muted">
              <ImagePlus className="size-6" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label}</span>
          <span className="mt-1 block text-xs text-muted">
            {busy ? "处理中…" : hint || (value ? "点这里更换" : "点这里从相册选图")}
          </span>
        </span>
      </label>
    );
  }

  return (
    <label className="relative block w-full overflow-hidden rounded-xl bg-surface text-left shadow-card">
      {input}
      {value ? (
        <img src={value} alt="" className="aspect-4/3 w-full object-cover" />
      ) : (
        <div className="flex aspect-4/3 flex-col items-center justify-center gap-2 text-sm text-muted">
          <ImagePlus className="size-6" />
          {busy ? "处理中…" : label}
        </div>
      )}
    </label>
  );
}
