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
      {/* Poster ~78%: category, title, 1-line subtitle, price pill */}
      <div className="relative overflow-hidden">
        <Cover
          src={event.coverUrl}
          alt={event.title}
          className={cn(
            "w-full object-cover transition duration-500 group-hover:scale-[1.02]",
            featured ? "aspect-[3/2]" : "aspect-[16/10]",
          )}
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink/75 via-ink/20 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-3 pr-16 text-surface">
          <Badge className="mb-1.5">{categoryName(event.category)}</Badge>
          <h2
            className={cn(
              "font-display font-semibold leading-snug tracking-tight",
              featured ? "text-lg" : "text-[15px]",
            )}
          >
            {event.title}
          </h2>
          {event.subtitle ? (
            <p className="mt-0.5 truncate text-xs leading-snug text-surface/80">
              {event.subtitle}
            </p>
          ) : null}
        </div>

        <span className="absolute bottom-3 right-3 rounded-full bg-lime px-2.5 py-1 text-xs font-semibold tabular-nums text-ink shadow-sm">
          {price}
        </span>
      </div>

      {/* Thin meta strip ~22%: when + place | remaining */}
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          featured ? "px-3 py-2" : "px-1 py-1.5",
        )}
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="flex items-center gap-1 text-[11px] leading-none text-muted">
            <Calendar className="size-3 shrink-0 opacity-70" aria-hidden />
            <span className="truncate">{when}</span>
          </p>
          <p className="flex items-center gap-1 text-[11px] leading-none text-muted">
            <MapPin className="size-3 shrink-0 opacity-70" aria-hidden />
            <span className="truncate">{place}</span>
          </p>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted">
          还剩 {event.remaining} 人
        </span>
      </div>
    </Link>
  );
}
