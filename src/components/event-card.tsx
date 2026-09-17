import { Link } from "@tanstack/react-router";
import { Calendar, MapPin } from "lucide-react";
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
  const when = formatWhen(event.startsAt, event.currency);
  const place = `${cityName(event.city)} · ${event.venue}`;
  const price = formatPrice(event.price, event.currency);

  return (
    <Link
      to="/events/$slug"
      params={{ slug: event.slug }}
      preload={false}
      className={cn(
        "group block overflow-hidden bg-surface",
        featured ? "rise-in rounded-xl" : "rounded-lg",
      )}
    >
      {/* Poster: category + title + subtitle only */}
      <div className="relative overflow-hidden">
        <Cover
          src={event.coverUrl}
          alt={event.title}
          className={cn(
            "w-full object-cover transition duration-500 group-hover:scale-[1.02]",
            featured ? "aspect-[3/2]" : "aspect-[16/10]",
          )}
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-surface">
          <Badge className="mb-2">{categoryName(event.category)}</Badge>
          <h2
            className={cn(
              "font-display font-bold leading-tight tracking-tight",
              featured ? "text-2xl" : "text-[17px]",
            )}
          >
            {event.title}
          </h2>
          {event.subtitle ? (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-surface/80">
              {event.subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {/* Meta below poster: datetime, place, price, remaining */}
      <div className={cn("space-y-1.5", featured ? "px-4 py-3.5" : "px-0.5 py-2.5")}>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Calendar className="size-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="min-w-0 truncate">{when}</span>
        </p>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="size-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="min-w-0 truncate">{place}</span>
        </p>
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <span
            className={cn(
              "text-[15px] font-semibold tabular-nums",
              event.price <= 0 ? "text-ink-soft" : "text-ink",
            )}
          >
            {price}
          </span>
          <span className="text-xs text-muted tabular-nums">还剩 {event.remaining} 人</span>
        </div>
      </div>
    </Link>
  );
}
