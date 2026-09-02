import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink shadow-card outline-none placeholder:text-muted",
        "transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_var(--color-ink)]",
        className,
      )}
      {...props}
    />
  );
}
