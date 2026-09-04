import { Link } from "@tanstack/react-router";
import { CoverFrame } from "@/components/cover-frame";
import { categoryName, cityName } from "@/lib/catalog";
import { formatPrice, formatWhen } from "@/lib/format";
import type { EventRecord } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function EventCard({
  event,
  featured = false,
}: {
  event: EventRecord;
  featured?: boolean;
}) {
  const tight = event.remaining > 0 && event.remaining <= 4;
  return (
    <Link
      to="/events/$slug"
      params={{ slug: event.slug }}
      preload={false}
      className="rise-in group relative block overflow-hidden rounded-xl"
    >
      <CoverFrame
        src={event.coverUrl}
        alt={event.title}
        className="rounded-xl"
        minRatio={0.78}
        maxRatio={featured ? 1.16 : 1.12}
        fallbackRatio={featured ? 1.12 : 1.08}
      >
        <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/35 to-ink/5" />
        <Badge className="absolute left-3 top-3">{categoryName(event.category)}</Badge>
        {tight ? (
          <span className="absolute right-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-[12px] font-semibold text-lime backdrop-blur-md">
            仅剩 {event.remaining} 席
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-4 text-surface">
          <h2
            className={cn(
              "font-display font-bold leading-tight tracking-tight",
              featured ? "text-[1.65rem]" : "text-xl",
            )}
          >
            {event.title}
          </h2>
          {featured && event.subtitle ? (
            <p className="mt-1 line-clamp-2 text-sm text-surface/80">{event.subtitle}</p>
          ) : null}
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0 text-sm text-surface/85">
              <p className="truncate">{formatWhen(event.startsAt, event.currency)}</p>
              <p className="mt-0.5 truncate">
                {cityName(event.city)} · {event.venue}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-lime px-3.5 py-1.5 text-sm font-semibold text-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.5)]">
              {formatPrice(event.price, event.currency)}
            </span>
          </div>
        </div>
      </CoverFrame>
    </Link>
  );
}
