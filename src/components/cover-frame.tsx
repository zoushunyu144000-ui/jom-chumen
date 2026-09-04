import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * height / width.
 * Feed cards stay in a compact 4:3–6:5 window so tall posters
 * crop instead of growing a black letterbox.
 */
export function clampCoverRatio(heightOverWidth: number, min = 0.75, max = 1.16) {
  if (!Number.isFinite(heightOverWidth) || heightOverWidth <= 0) return 1.1;
  return Math.min(max, Math.max(min, heightOverWidth));
}

export function CoverFrame({
  src,
  alt,
  className,
  children,
  minRatio = 0.75,
  maxRatio = 1.16,
  fallbackRatio = 1.1,
  onRatio,
}: {
  src?: string;
  alt: string;
  className?: string;
  children?: ReactNode;
  minRatio?: number;
  maxRatio?: number;
  fallbackRatio?: number;
  onRatio?: (ratio: number) => void;
}) {
  const [ratio, setRatio] = useState(fallbackRatio);
  const showImg = Boolean(src) && !(src?.startsWith("data:") && (src?.length ?? 0) > 20_000);

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-paper-2", className)}
      style={{ aspectRatio: `1 / ${clampCoverRatio(ratio, minRatio, maxRatio)}` }}
    >
      {showImg && src ? (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 size-full object-cover object-center [outline:none]"
          loading="lazy"
          decoding="async"
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
            if (!w || !h) return;
            const next = h / w;
            setRatio(next);
            onRatio?.(next);
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-end bg-ink p-4">
          <p className="font-display text-xl font-bold leading-tight text-lime">{alt}</p>
        </div>
      )}
      {children}
    </div>
  );
}
