import { Link } from "@tanstack/react-router";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { categoryName, cityName } from "@/lib/catalog";
import { formatPrice, formatWhen } from "@/lib/format";
import type { EventRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

function Cover({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex items-end bg-gradient-to-br from-ink to-ink-soft p-4",
          className,
        )}
      >
        <span className="font-display text-lg text-surface/90">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      loading="lazy"
    />
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
  const seats =
    event.remaining > 0 ? `还剩 ${event.remaining} 人` : null;

  return (
    <Link
      to="/events/$slug"
      params={{ slug: event.slug }}
      className={cn(
        "group block overflow-hidden bg-surface shadow-card transition",
        featured ? "rounded-2xl" : "rounded-xl",
      )}
    >
      {/* Poster: category + title + subtitle only */}
      <div
        className={cn(
          "relative overflow-hidden",
          featured ? "aspect-[3/2]" : "aspect-[16/10]",
        )}
      >
        <Cover
          src={event.coverUrl}
          alt={event.title}
          className="absolute inset-0 h-full w-full transition duration-500 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4 text-surface">
          <Badge className="w-fit">{categoryName(event.category)}</Badge>
          <h3
            className={cn(
              "font-display font-semibold leading-snug tracking-tight text-surface",
              featured ? "text-2xl" : "text-xl",
            )}
          >
            {event.title}
          </h3>
          {event.subtitle ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-surface/85">
              {event.subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {/* Meta below poster: datetime, place, price, seats */}
      <div className={cn("space-y-2", featured ? "px-4 py-3.5" : "px-3.5 py-3")}>
        <p className="flex items-start gap-1.5 text-[13px] leading-snug text-muted">
          <Calendar className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="min-w-0">{when}</span>
        </p>
        <p className="flex items-start gap-1.5 text-[13px] leading-snug text-muted">
          <MapPin className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="min-w-0 truncate">{place}</span>
        </p>
        <div className="flex items-baseline justify-between gap-3 pt-0.5">
          <span className="text-[15px] font-semibold tabular-nums text-ink">
            {price}
          </span>
          {seats ? (
            <span className="text-xs tabular-nums text-muted">{seats}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
