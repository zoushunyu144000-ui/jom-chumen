import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-lime px-3 py-1 text-[13px] font-semibold leading-none text-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.55)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
