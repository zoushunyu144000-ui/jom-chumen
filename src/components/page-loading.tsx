export function PageLoading({ label = "加载中" }: { label?: string }) {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-6">
      <div className="size-11 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
      <p className="mt-4 text-sm text-muted">{label}</p>
    </main>
  );
}
