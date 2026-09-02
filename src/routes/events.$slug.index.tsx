import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventBody } from "@/components/event-body";
import { categoryName, cityName } from "@/lib/catalog";
import { formatLevel, formatPrice, formatRange } from "@/lib/format";
import { getEventBySlug } from "@/lib/server/events";

export const Route = createFileRoute("/events/$slug/")({
  loader: async ({ params }) => {
    const event = await getEventBySlug({ data: { slug: params.slug } });
    if (!event) throw notFound();
    return { event };
  },
  notFoundComponent: () => (
    <main className="px-6 py-20 text-center">
      <p className="font-display text-xl font-semibold">这场局不存在</p>
      <Link to="/" className="mt-4 inline-block text-sm text-muted underline">
        回到发现
      </Link>
    </main>
  ),
  component: EventDetail,
});

function EventDetail() {
  const { event } = Route.useLoaderData();
  const soldOut = event.remaining <= 0;
  const hasBody = event.body.some((block) => {
    if (block.type === "img") return Boolean(block.src);
    if (block.type === "ul") return block.items.some((item) => item.trim());
    return Boolean(block.text?.trim());
  });

  return (
    <main className="pb-28">
      <div className="relative">
        <img
          src={event.coverUrl}
          alt={event.title}
          className="aspect-4/3 w-full object-cover"
        />
        <Link
          to="/"
          className="absolute left-3 top-3 flex size-11 items-center justify-center rounded-full bg-paper/90 text-ink shadow-card"
          aria-label="返回"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Badge className="absolute bottom-3 left-3">
          {categoryName(event.category)}
        </Badge>
      </div>

      <section className="px-4 pt-4">
        <p className="text-xs font-medium text-muted">
          {cityName(event.city)} · {formatLevel(event.level)}
        </p>
        <h1 className="mt-1 font-display text-[1.7rem] font-bold leading-tight tracking-tight">
          {event.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{event.subtitle}</p>

        <ul className="mt-4 space-y-2.5 rounded-xl bg-surface p-4 text-sm shadow-card">
          <li className="flex gap-3">
            <Calendar className="mt-0.5 size-4 shrink-0 text-muted" />
            <span>{formatRange(event.startsAt, event.endsAt, event.currency)}</span>
          </li>
          <li className="flex gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
            <span>
              {event.venue}
              <span className="mt-0.5 block text-xs text-muted">
                {event.address}
              </span>
            </span>
          </li>
          <li className="flex gap-3">
            <Users className="mt-0.5 size-4 shrink-0 text-muted" />
            <span>
              {event.capacity} 人局 · 还剩 {event.remaining} 席
            </span>
          </li>
        </ul>

        {event.clubId && event.clubName ? (
          <Link
            to="/clubs/$id"
            params={{ id: event.clubId }}
            className="mt-5 flex items-center gap-3"
          >
            <div className="flex size-11 items-center justify-center rounded-full bg-lime font-display text-sm font-bold">
              {event.clubName.slice(0, 1)}
            </div>
            <div>
              <p className="text-sm font-medium">{event.clubName}</p>
              <p className="text-xs text-muted">{event.hostNote || "查看俱乐部"}</p>
            </div>
          </Link>
        ) : (
          <div className="mt-5 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-lime font-display text-sm font-bold">
              {event.hostName.slice(0, 1)}
            </div>
            <div>
              <p className="text-sm font-medium">发起人 {event.hostName}</p>
              <p className="text-xs text-muted">{event.hostNote}</p>
            </div>
          </div>
        )}

        <h2 className="mt-8 font-display text-lg font-semibold">活动详情</h2>
        {hasBody ? (
          <EventBody blocks={event.body} />
        ) : (
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            {event.description}
          </p>
        )}

        {event.highlights.length > 0 ? (
          <>
            <h2 className="mt-7 font-display text-lg font-semibold">包含与须知</h2>
            <ul className="mt-2 space-y-2">
              {event.highlights.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-sm text-ink-soft before:mt-2 before:size-1.5 before:shrink-0 before:rounded-full before:bg-lime before:content-['']"
                >
                  {item}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-center gap-3 border-t border-line bg-paper/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div>
          <p className="font-display text-xl font-bold tabular-nums leading-none">
            {formatPrice(event.price, event.currency)}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {!event.open
              ? "已停止报名"
              : soldOut
                ? "名额已满，仍可提交，由发起人决定"
                : `还剩 ${event.remaining} 人 · 提交后需审核`}
          </p>
        </div>
        {!event.open ? (
          <Button className="ml-auto min-w-36" disabled>
            已停止报名
          </Button>
        ) : (
          <Button asChild className="ml-auto min-w-36">
            <Link to="/events/$slug/register" params={{ slug: event.slug }}>
              提交报名申请
            </Link>
          </Button>
        )}
      </div>
    </main>
  );
}
