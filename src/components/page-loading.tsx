export function PageLoading({ label = "加载中" }: { label?: string }) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center px-6">
      <div className="relative flex size-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-[3px] border-ink/10" />
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-lime border-r-lime" />
        <span className="font-display text-sm font-bold">Jom</span>
      </div>
      <p className="mt-4 text-sm font-medium text-ink">{label}</p>
    </div>
  );
}
