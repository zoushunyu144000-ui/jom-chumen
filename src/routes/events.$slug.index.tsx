import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventBody } from "@/components/event-body";
import { EventGallery, eventGalleryImages } from "@/components/event-gallery";
import { EventPeople } from "@/components/event-people";
import { EventShareButton } from "@/components/event-share";
import { EventPageSkeleton } from "@/components/page-loading";
import { EventMap } from "@/components/place-picker";
import { categoryName, cityName } from "@/lib/catalog";
import { formatPrice, formatRange } from "@/lib/format";
import { eventOgImageUrl, eventShareUrl } from "@/lib/public-url";
import { getPublicEvent } from "@/lib/server/event-public";
import { getEventIntro } from "@/lib/server/event-meta";

export const Route = createFileRoute("/events/$slug/")({
  loader: async ({ params }) => {
    const event = await getPublicEvent({ data: { slug: params.slug } });
    if (!event) throw notFound();
    const intro = await getEventIntro({ data: { slug: params.slug } }).catch(() => []);
    return { event, intro };
  },
  staleTime: 0,
  pendingMs: 0,
  pendingComponent: () => <EventPageSkeleton label="打开活动" />,
  head: ({ loaderData }) => {
    const event = loaderData?.event;
    if (!event) return {};
    const url = eventShareUrl(event.slug);
    const image = eventOgImageUrl(event.slug);
    const desc = `${formatPrice(event.price, event.currency)} · ${event.venue}`;
    return {
      meta: [
        { title: `${event.title} · Jom 出门局` },
        { name: "description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Jom 出门局" },
        { property: "og:title", content: event.title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:type", content: "image/jpeg" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: event.title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: image },
      ],
    };
  },
  errorComponent: () => (
    <main className="px-6 py-20 text-center">
      <p className="font-display text-xl font-semibold">活动页加载失败</p>
      <Link to="/" className="mt-4 inline-block text-sm underline">回到发现</Link>
    </main>
  ),
  notFoundComponent: () => (
    <main className="px-6 py-20 text-center">
      <p className="font-display text-xl font-semibold">这场局不存在</p>
      <Link to="/" className="mt-4 inline-block text-sm text-muted underline">回到发现</Link>
    </main>
  ),
  component: EventDetail,
});

function EventDetail() {
  const { event, intro } = Route.useLoaderData();
  const soldOut = event.remaining <= 0;
  const images = eventGalleryImages({ coverUrl: event.coverUrl, body: event.body });
  const introBlocks = intro ?? [];
  const hasIntro = introBlocks.some((block) => {
    if (block.type === "img") return Boolean(block.src);
    if (block.type === "ul") return block.items.some((item) => item.trim());
    return Boolean(block.text?.trim());
  });
  const hasMap = event.lat != null && event.lng != null;
  const apply = event.myApply;
  const priceLabel = formatPrice(event.price, event.currency);

  return (
    <main className="pb-28">
      <div className="relative">
        <EventGallery images={images.length ? images : [event.coverUrl]} alt={event.title} />
        <Link to="/" className="glass-pill absolute left-3 top-3 z-10 flex size-11 items-center justify-center rounded-full text-ink" aria-label="返回">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="absolute right-3 top-3 z-10">
          <EventShareButton event={event} />
        </div>
        <Badge className="absolute left-3 top-16 z-10">{categoryName(event.category)}</Badge>
      </div>
      <section className="px-4 pt-4">
        <p className="text-xs font-medium text-muted">{cityName(event.city)}</p>
        <h1 className="mt-1 font-display text-[1.7rem] font-bold leading-tight tracking-tight">{event.title}</h1>
        {event.subtitle ? <p className="mt-1 text-sm text-ink-soft">{event.subtitle}</p> : null}

        <ul className="mt-4 space-y-2.5 text-[15px]">
          <li className="flex gap-3">
            <Calendar className="mt-0.5 size-4 shrink-0 text-muted" />
            <span className="font-medium">{formatRange(event.startsAt, event.endsAt, event.currency)}</span>
          </li>
          <li className="flex gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
            <span className="font-medium">{event.venue}</span>
          </li>
          <li className="flex gap-3">
            <Users className="mt-0.5 size-4 shrink-0 text-muted" />
            <span className="font-medium">
              {priceLabel}
              <span className="text-muted"> · </span>
              {soldOut ? "已满" : `已报 ${event.booked}/${event.capacity}`}
            </span>
          </li>
        </ul>

        <EventPeople slug={event.slug} />
        {hasMap ? <EventMap lat={event.lat as number} lng={event.lng as number} label={event.venue} className="mt-4" /> : null}
        {event.clubId && event.clubName ? (
          <Link to="/clubs/$id" params={{ id: event.clubId }} className="mt-5 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-lime font-display text-sm font-bold">{event.clubName.slice(0, 1)}</div>
            <div><p className="text-sm font-medium">{event.clubName}</p><p className="text-xs text-muted">查看俱乐部</p></div>
          </Link>
        ) : null}
        {event.clubId ? (
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link to="/chat/$id" params={{ id: event.clubId }}>联系主办 / 发私信</Link>
          </Button>
        ) : null}
        {hasIntro ? (
          <>
            <h2 className="mt-8 font-display text-lg font-semibold">活动简介</h2>
            <EventBody blocks={introBlocks} />
          </>
        ) : event.description ? (
          <>
            <h2 className="mt-8 font-display text-lg font-semibold">活动简介</h2>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">{event.description}</p>
          </>
        ) : null}
        {event.highlights.length > 0 ? (
          <>
            <h2 className="mt-7 font-display text-lg font-semibold">活动提醒</h2>
            <ul className="mt-2 space-y-2">
              {event.highlights.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-ink-soft before:mt-2 before:size-1.5 before:shrink-0 before:rounded-full before:bg-lime before:content-['']">{item}</li>
              ))}
            </ul>
          </>
        ) : null}
        <div className="mt-6">
          <EventShareButton event={event} />
        </div>
      </section>
      <div className="glass-nav fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div>
          <p className="font-display text-xl font-bold tabular-nums leading-none">{priceLabel}</p>
          <p className="mt-1 text-[11px] text-muted">{apply ? "已报名" : soldOut ? "名额已满" : `已报 ${event.booked}/${event.capacity}`}</p>
        </div>
        {apply ? (
          <Button asChild className="ml-auto min-w-36"><a href={`/apply/${apply.code}`}>查看申请</a></Button>
        ) : !event.open ? (
          <Button className="ml-auto min-w-36" disabled>已停止报名</Button>
        ) : (
          <Button asChild className="ml-auto min-w-36"><Link to="/events/$slug/register" params={{ slug: event.slug }}>提交报名申请</Link></Button>
        )}
      </div>
    </main>
  );
}
