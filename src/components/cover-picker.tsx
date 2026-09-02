import { Camera, ImagePlus } from "lucide-react";
import { compressImage } from "@/lib/image";
import { cn } from "@/lib/utils";

export function CoverPicker({
  value,
  onChange,
  label = "封面图",
  variant = "cover",
}: {
  value: string;
  onChange: (src: string) => void;
  label?: string;
  variant?: "cover" | "avatar" | "qr";
}) {
  async function pick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const edge = variant === "avatar" ? 640 : variant === "qr" ? 900 : 1600;
      onChange(await compressImage(file, edge, 0.84));
    };
    input.click();
  }

  if (variant === "avatar") {
    return (
      <button
        type="button"
        onClick={() => void pick()}
        className="relative mx-auto block size-28 overflow-hidden rounded-full bg-paper-2 shadow-card"
        aria-label={label}
      >
        {value ? (
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-sm text-muted">
            {label}
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 flex h-8 items-center justify-center bg-ink/70 text-lime">
          <Camera className="size-4" />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void pick()}
      className="block w-full overflow-hidden rounded-xl bg-surface text-left shadow-card"
    >
      {value ? (
        <img
          src={value}
          alt=""
          className={cn(
            "w-full object-cover",
            variant === "qr" ? "aspect-square" : "aspect-4/3",
          )}
        />
      ) : (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 text-sm text-muted",
            variant === "qr" ? "aspect-square" : "aspect-4/3",
          )}
        >
          <ImagePlus className="size-6" />
          {label}
        </div>
      )}
    </button>
  );
}
