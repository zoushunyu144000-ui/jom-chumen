export function PageLoading({ label = "请稍候" }: { label?: string }) {
  return (
    <div className="flex min-h-[46dvh] flex-col items-center justify-center px-6">
      <div className="relative size-9">
        <span className="absolute inset-0 rounded-full border border-ink/15" />
        <span className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-ink" />
      </div>
      {label ? <p className="mt-4 text-xs tracking-wide text-muted">{label}</p> : null}
    </div>
  );
}
