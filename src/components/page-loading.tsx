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
          ? "flex flex-col items-center justify-center px-6 py-12"
          : "flex min-h-[46dvh] flex-col items-center justify-center px-6"
      }
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="jom-spin-wrap" aria-hidden="true">
        <span className="jom-spin-bar" />
      </span>
      {label ? (
        <p className="mt-5 font-display text-[13px] font-semibold tracking-[0.22em] text-ink-soft">
          {label}
        </p>
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
