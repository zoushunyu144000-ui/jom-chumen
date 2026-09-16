import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { categoryName, cityName } from "@/lib/catalog";
import { formatPrice, formatWhen } from "@/lib/format";
import type { EventRecord } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function Cover({ src, alt, className }: { src: string; alt: string; className: string }) {
  if (src && !src.startsWith("data:")) {
    return <img src={src} alt={alt} loading="lazy" decoding="async" className={className} />;
  }
  if (src.startsWith("data:") && src.length < 20000) {
    return <img src={src} alt={alt} loading="lazy" decoding="async" className={className} />;
  }
  return (
    <div className={cn(className, "flex items-end bg-ink p-4")}>
      <p className="font-display text-xl font-bold leading-tight text-lime">{alt}</p>
    </div>
  );
}

export function EventCard({
  event,
  featured = false,
}: {
  event: EventRecord;
  featured?: boolean;
}) {
  const tight = event.remaining > 0 && event.remaining <= 4;

  if (featured) {
    return (
      <Link to="/events/$slug" params={{ slug: event.slug }} preload={false} className="rise-in group relative block overflow-hidden rounded-xl">
        <Cover src={event.coverUrl} alt={event.title} className="aspect-4/5 w-full object-cover sm:aspect-4/3" />
        <div className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-surface">
          <Badge className="mb-2">{categoryName(event.category)}</Badge>
          <h2 className="font-display text-2xl font-bold leading-tight tracking-tight">{event.title}</h2>
          <p className="mt-1 text-sm text-surface/80">{event.subtitle}</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="text-sm text-surface/80">
              <p>{formatWhen(event.startsAt, event.currency)}</p>
              <p className="mt-0.5">{cityName(event.city)} · {event.venue}</p>
            </div>
            <span className="rounded-md bg-lime px-3 py-1.5 text-sm font-semibold text-ink">
              {formatPrice(event.price, event.currency)}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to="/events/$slug" params={{ slug: event.slug }} preload={false} className="group block">
      <div className="relative overflow-hidden rounded-lg">
        <Cover src={event.coverUrl} alt={event.title} className="aspect-4/3 w-full object-cover" />
        <Badge className="absolute left-2 top-2">{categoryName(event.category)}</Badge>
        {tight ? (
          <span className="absolute right-2 top-2 rounded-full bg-ink/85 px-2 py-0.5 text-[11px] font-medium text-lime">
            仅剩 {event.remaining} 席
          </span>
        ) : null}
      </div>
      <div className="px-0.5 pt-2.5">
        <h3 className="font-display text-[17px] font-semibold leading-snug tracking-tight text-ink">{event.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{formatWhen(event.startsAt, event.currency)} · {event.venue}</span>
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className={cn("text-[15px] font-semibold tabular-nums", event.price <= 0 ? "text-ink-soft" : "text-ink")}>
            {formatPrice(event.price, event.currency)}
          </span>
          <span className="text-xs text-muted tabular-nums">还剩 {event.remaining} 人</span>
        </div>
      </div>
    </Link>
  );
}
