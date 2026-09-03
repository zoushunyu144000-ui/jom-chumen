import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, Calendar, MapPin, Ticket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventBody } from "@/components/event-body";
import { EventGallery, eventGalleryImages } from "@/components/event-gallery";
import { EventShareButton } from "@/components/event-share";
import { GALLERY_CAPTION } from "@/components/event-form";
import { EventMap } from "@/components/place-picker";
import { categoryName, cityName } from "@/lib/catalog";
import { formatPrice, formatRange } from "@/lib/format";
import { eventOgImageUrl, eventShareUrl } from "@/lib/public-url";
import { getEventBySlug } from "@/lib/server/events";

export const Route = createFileRoute("/events/$slug/")({
  loader: async ({ params }) => {
    const event = await getEventBySlug({ data: { slug: params.slug } });
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData }) => {
    const event = loaderData?.event;
    if (!event) return {};
    const url = eventShareUrl(event.slug);
    const image = eventOgImageUrl(event.slug);
    const desc = `${formatPrice(event.price, event.currency)} · ${formatRange(event.startsAt, event.endsAt, event.currency)} · ${event.venue}`;
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
  const { event } = Route.useLoaderData();
  const soldOut = event.remaining <= 0;
  const body = event.body ?? [];
  const images = eventGalleryImages({ coverUrl: event.coverUrl, body });
  const introBlocks = body.filter((block) => !(block.type === "img" && block.caption === GALLERY_CAPTION));
  const hasIntro = introBlocks.some((block) => {
    if (block.type === "img") return Boolean(block.src);
    if (block.type === "ul") return block.items.some((item) => item.trim());
    return Boolean(block.text?.trim());
  });
  const hasMap = event.lat != null && event.lng != null;

  return (
    <main className="pb-28">
      <div className="relative">
        <EventGallery images={images.length ? images : [event.coverUrl]} alt={event.title} />
        <Link to="/" className="absolute left-3 top-3 z-10 flex size-11 items-center justify-center rounded-full bg-paper/90 text-ink shadow-card" aria-label="返回">
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
        <ul className="mt-4 space-y-3 rounded-xl bg-surface p-4 text-sm shadow-card">
          <li className="flex gap-3"><Calendar className="mt-0.5 size-4 shrink-0 text-muted" /><span>{formatRange(event.startsAt, event.endsAt, event.currency)}</span></li>
          <li className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-muted" /><span>{event.venue}{event.address && event.address !== event.venue ? <span className="mt-0.5 block text-xs text-muted">{event.address}</span> : null}</span></li>
          <li className="flex gap-3"><Ticket className="mt-0.5 size-4 shrink-0 text-muted" /><span>{formatPrice(event.price, event.currency)}</span></li>
          <li className="flex gap-3"><Users className="mt-0.5 size-4 shrink-0 text-muted" /><span>已报 {event.booked}/{event.capacity}{event.remaining > 0 ? ` · 还剩 ${event.remaining}` : " · 名额已满"}</span></li>
        </ul>
        {hasMap ? <EventMap lat={event.lat as number} lng={event.lng as number} label={event.venue} className="mt-4" /> : null}
        {event.clubId && event.clubName ? (
          <Link to="/clubs/$id" params={{ id: event.clubId }} className="mt-5 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-lime font-display text-sm font-bold">{event.clubName.slice(0, 1)}</div>
            <div><p className="text-sm font-medium">{event.clubName}</p><p className="text-xs text-muted">查看俱乐部</p></div>
          </Link>
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
        <Button type="button" variant="outline" className="mt-6 w-full" onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="分享活动"]')?.click()}>
          分享这场活动
        </Button>
      </section>
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-center gap-3 border-t border-line bg-paper/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div>
          <p className="font-display text-xl font-bold tabular-nums leading-none">{formatPrice(event.price, event.currency)}</p>
          <p className="mt-1 text-[11px] text-muted">{!event.open ? "已停止报名" : soldOut ? "名额已满，仍可提交" : `已报 ${event.booked}/${event.capacity}`}</p>
        </div>
        {!event.open ? (
          <Button className="ml-auto min-w-36" disabled>已停止报名</Button>
        ) : (
          <Button asChild className="ml-auto min-w-36">
            <Link to="/events/$slug/register" params={{ slug: event.slug }}>提交报名申请</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
