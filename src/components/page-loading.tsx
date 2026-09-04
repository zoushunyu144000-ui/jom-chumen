export function PageLoading({
  label = "加载中",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center justify-center px-6 py-10"
          : "flex min-h-[46dvh] flex-col items-center justify-center px-6"
      }
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="jom-spin" aria-hidden="true" />
      {label ? (
        <p className="mt-4 text-sm font-medium text-muted">{label}</p>
      ) : null}
    </div>
  );
}

export function RoutePending({ label = "加载中" }: { label?: string }) {
  return (
    <>
      <div className="jom-route-bar" aria-hidden="true">
        <span />
      </div>
      <PageLoading label={label} />
    </>
  );
}

export function FeedSkeleton({ label = "加载中" }: { label?: string }) {
  return (
    <main className="pb-6" aria-busy="true" aria-label={label}>
      <div className="jom-route-bar" aria-hidden="true">
        <span />
      </div>
      <div className="px-4 pt-4">
        <div className="h-7 w-28 rounded-md bg-paper-2" />
        <div className="mt-3 h-4 w-40 rounded-md bg-paper-2" />
      </div>
      <div className="mt-4 flex gap-2 px-4">
        <div className="h-9 w-16 rounded-full bg-ink" />
        <div className="h-9 w-16 rounded-full bg-surface shadow-card" />
        <div className="h-9 w-16 rounded-full bg-surface shadow-card" />
        <div className="h-9 w-16 rounded-full bg-surface shadow-card" />
      </div>
      <div className="mt-4 px-4">
        <div className="overflow-hidden rounded-xl bg-surface shadow-card">
          <div className="aspect-[6/5] bg-paper-2" />
        </div>
      </div>
      <div className="mt-6 px-4 space-y-5">
        <div className="h-5 w-24 rounded-md bg-paper-2" />
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="aspect-[6/5] overflow-hidden rounded-xl bg-paper-2" />
            <div className="mt-2.5 h-5 w-3/4 rounded-md bg-paper-2" />
            <div className="mt-2 h-4 w-1/2 rounded-md bg-paper-2" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function EventPageSkeleton({ label = "打开活动" }: { label?: string }) {
  return (
    <main className="pb-28" aria-busy="true" aria-label={label}>
      <div className="jom-route-bar" aria-hidden="true">
        <span />
      </div>
      <div className="aspect-[6/5] bg-paper-2" />
      <section className="px-4 pt-4">
        <div className="h-3 w-16 rounded-md bg-paper-2" />
        <div className="mt-2 h-8 w-4/5 rounded-md bg-paper-2" />
        <div className="mt-4 space-y-3 rounded-xl bg-ink p-4">
          <div className="h-8 w-32 rounded-md bg-lime/40" />
          <div className="h-4 w-48 rounded-md bg-white/10" />
          <div className="h-4 w-40 rounded-md bg-white/10" />
        </div>
        <div className="mt-4 h-20 rounded-xl bg-surface shadow-card" />
      </section>
    </main>
  );
}
