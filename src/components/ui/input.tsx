import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-md bg-surface px-3.5 text-[15px] text-ink shadow-card outline-none placeholder:text-muted",
        "transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_var(--color-ink)]",
        className,
      )}
      {...props}
    />
  );
}
