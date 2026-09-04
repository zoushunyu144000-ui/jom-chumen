import { useEffect, useRef } from "react";
import { PhotoStrip } from "@/components/photo-strip";
import { BlockEditor } from "@/components/block-editor";
import { PlacePicker } from "@/components/place-picker";
import { PageLoading } from "@/components/page-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, EVENT_CITIES } from "@/lib/catalog";
import { GALLERY_CAPTION, isGalleryImage } from "@/lib/server/event-media-parse";
import type { BodyBlock, CategoryId, CityId, ClubRecord } from "@/lib/types";
import { Link } from "@tanstack/react-router";

export { GALLERY_CAPTION };

export type EventDraft = {
  clubId: string;
  newClubName: string;
  title: string;
  subtitle: string;
  category: Exclude<CategoryId, "all">;
  city: Exclude<CityId, "all">;
  venue: string;
  address: string;
  lat: number | null;
  lng: number | null;
  startsAt: string;
  endsAt: string;
  price: string;
  capacity: string;
  coverUrl: string;
  photos: string[];
  description: string;
  hostNote: string;
  highlights: string;
  body: BodyBlock[];
  refundHours: string;
  refundFeePercent: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function defaultEventRange() {
  const start = new Date();
  start.setDate(start.getDate() + 3);
  start.setHours(16, 0, 0, 0);
  const end = new Date(start);
  end.setHours(18, 0, 0, 0);
  return { start: toLocalInput(start), end: toLocalInput(end) };
}

export function emptyEventDraft(): EventDraft {
  const range = defaultEventRange();
  return {
    clubId: "",
    newClubName: "",
    title: "",
    subtitle: "",
    category: "talk",
    city: "penang",
    venue: "",
    address: "",
    lat: null,
    lng: null,
    startsAt: range.start,
    endsAt: range.end,
    price: "0",
    capacity: "12",
    coverUrl: "",
    photos: [],
    description: "",
    hostNote: "",
    highlights: "",
    body: [{ type: "p", text: "" }],
    refundHours: "24",
    refundFeePercent: "50",
  };
}

export function EventForm({
  clubs,
  allowNewClub = true,
  value,
  onChange,
  busy,
  submitLabel,
  onSubmit,
}: {
  clubs: ClubRecord[];
  allowNewClub?: boolean;
  value: EventDraft;
  onChange: (next: EventDraft) => void;
  busy: boolean;
  submitLabel: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const eventCategories = CATEGORIES.filter((c) => c.id !== "all");
  const set = (patch: Partial<EventDraft>) => onChange({ ...value, ...patch });
  const lock = useRef(false);

  useEffect(() => {
    if (!busy) lock.current = false;
  }, [busy]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || lock.current) return;
    lock.current = true;
    onSubmit(e);
  }

  const busyLabel = submitLabel.includes("发布") ? "正在发布，请不要重复点击" : "正在保存";

  return (
    <form onSubmit={handleSubmit} className="relative space-y-6">
      {busy ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper/85">
          <PageLoading label={busyLabel} />
        </div>
      ) : null}
      <fieldset disabled={busy} className="min-w-0 w-full space-y-6 border-0 p-0">
      <section className="space-y-3 rounded-xl bg-surface p-4 shadow-card">
        <p className="text-xs font-semibold tracking-wide text-muted">1 · 照片</p>
        <Label>封面和滑动图</Label>
        <p className="text-xs text-muted">可一次多选。第一张是封面，竖图按竖图显示，不会被裁成横图。</p>
        <PhotoStrip photos={value.photos} onChange={(photos) => set({ photos, coverUrl: photos[0] ?? "" })} />
      </section>

      <p className="rounded-lg bg-lime/30 px-3 py-2 text-sm">
        报名要扫你的 TNG 收款码、加 WhatsApp。在
        <Link to="/me/host" className="mx-1 underline">收款与客服</Link>
        里设好再发。
      </p>

      <section className="space-y-3 rounded-xl bg-surface p-4 shadow-card">
        <p className="text-xs font-semibold tracking-wide text-muted">2 · 基本信息</p>
      {clubs.length > 0 ? (
        <div className="space-y-1.5">
          <Label>俱乐部</Label>
          <NativeSelect value={value.clubId} onChange={(e) => set({ clubId: e.target.value })}>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>{club.name}</option>
            ))}
          </NativeSelect>
        </div>
      ) : allowNewClub ? (
        <div className="space-y-1.5">
          <Label htmlFor="new-club">新俱乐部名称</Label>
          <Input id="new-club" value={value.newClubName} onChange={(e) => set({ newClubName: e.target.value })} placeholder="没有俱乐部的话，这里会一起建" />
        </div>
      ) : (
        <p className="text-sm text-muted">先创建俱乐部再编辑活动。</p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title">活动标题</Label>
        <Input id="title" value={value.title} onChange={(e) => set({ title: e.target.value })} placeholder="比如 周日飞盘局" maxLength={40} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="subtitle">一句话介绍</Label>
        <Input id="subtitle" value={value.subtitle} onChange={(e) => set({ subtitle: e.target.value })} placeholder="出现在标题下面" maxLength={60} />
        </div>
      </section>

      <section className="space-y-3 rounded-xl bg-surface p-4 shadow-card">
        <p className="text-xs font-semibold tracking-wide text-muted">3 · 时间地点</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>分类</Label>
          <NativeSelect value={value.category} onChange={(e) => set({ category: e.target.value as Exclude<CategoryId, "all"> })}>
            {eventCategories.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label>城市</Label>
          <NativeSelect value={value.city} onChange={(e) => set({ city: e.target.value as Exclude<CityId, "all"> })}>
            {EVENT_CITIES.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>地点</Label>
        <PlacePicker venue={value.venue} address={value.address} lat={value.lat} lng={value.lng} city={value.city} onChange={(place) => set(place)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>开始</Label>
          <Input type="datetime-local" value={value.startsAt} onChange={(e) => set({ startsAt: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>结束</Label>
          <Input type="datetime-local" value={value.endsAt} onChange={(e) => set({ endsAt: e.target.value })} required />
        </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl bg-surface p-4 shadow-card">
        <p className="text-xs font-semibold tracking-wide text-muted">4 · 费用与退款</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>票价（0 为免费）</Label>
          <Input inputMode="decimal" value={value.price} onChange={(e) => set({ price: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>人数上限</Label>
          <Input inputMode="numeric" value={value.capacity} onChange={(e) => set({ capacity: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>提前多少小时可全额退</Label>
          <NativeSelect value={value.refundHours} onChange={(e) => set({ refundHours: e.target.value })}>
            <option value="48">48 小时</option>
            <option value="24">24 小时</option>
            <option value="12">12 小时</option>
            <option value="6">6 小时</option>
            <option value="0">不支持全额退</option>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label>逾期扣费</Label>
          <NativeSelect value={value.refundFeePercent} onChange={(e) => set({ refundFeePercent: e.target.value })}>
            <option value="0">不扣</option>
            <option value="30">扣 30%</option>
            <option value="50">扣 50%</option>
            <option value="100">不退款</option>
          </NativeSelect>
        </div>
      </div>
      <p className="text-xs text-muted">例如提前 24 小时申请退款免手续费；不够 24 小时则扣 50%。</p>
      </section>

      <section className="space-y-3 rounded-xl bg-surface p-4 shadow-card">
        <p className="text-xs font-semibold tracking-wide text-muted">5 · 活动简介</p>
        <Label>正文</Label>
        <p className="text-xs text-muted">可从 ChatGPT 整段粘贴。标题、段落、列表会自动拆开。点「在这段下面插图」把图插进文字。</p>
        <BlockEditor value={value.body} onChange={(body) => set({ body })} />
      </section>

      <section className="space-y-3 rounded-xl bg-surface p-4 shadow-card">
        <p className="text-xs font-semibold tracking-wide text-muted">6 · 活动提醒</p>

      <div className="space-y-1.5">
        <Label>活动提醒（每行一条）</Label>
        <Textarea value={value.highlights} onChange={(e) => set({ highlights: e.target.value })} rows={3} placeholder={"请穿运动鞋\n自备水杯"} />
      </div>
      </section>

      <Button type="submit" className="w-full" disabled={busy} aria-busy={busy}>
        {busy ? busyLabel : submitLabel}
      </Button>
      </fieldset>
    </form>
  );
}

export function draftFromEvent(event: {
  clubId: string | null;
  title: string;
  subtitle: string;
  category: Exclude<CategoryId, "all">;
  city: Exclude<CityId, "all">;
  venue: string;
  address: string;
  lat: number | null;
  lng: number | null;
  startsAt: string;
  endsAt: string;
  price: number;
  capacity: number;
  coverUrl: string;
  hostNote: string;
  highlights: string[];
  description?: string;
  body: BodyBlock[];
  refundHours?: number;
  refundFeePercent?: number;
}): EventDraft {
  const gallery = event.body.filter(
    (block): block is Extract<BodyBlock, { type: "img" }> => isGalleryImage(block),
  );
  const photos = [event.coverUrl, ...gallery.map((b) => b.src)].filter((src, i, arr) => src && arr.indexOf(src) === i);
  const body = event.body.filter((block) => !isGalleryImage(block));
  return {
    clubId: event.clubId ?? "",
    newClubName: "",
    title: event.title,
    subtitle: event.subtitle,
    category: event.category,
    city: event.city,
    venue: event.venue,
    address: event.address,
    lat: event.lat,
    lng: event.lng,
    startsAt: toLocalInput(new Date(event.startsAt)),
    endsAt: toLocalInput(new Date(event.endsAt)),
    price: String(event.price),
    capacity: String(event.capacity),
    coverUrl: photos[0] ?? event.coverUrl,
    photos,
    description: event.description ?? "",
    hostNote: "",
    highlights: event.highlights.join("\n"),
    body: body.length ? body : [{ type: "p", text: event.description ?? "" }],
    refundHours: String(event.refundHours ?? 24),
    refundFeePercent: String(event.refundFeePercent ?? 50),
  };
}

export function parseEventDraft(value: EventDraft) {
  const photos = value.photos.filter(Boolean);
  const coverUrl = photos[0] ?? value.coverUrl;
  const galleryBlocks: BodyBlock[] = photos.slice(1).map((src) => ({ type: "img", src, caption: GALLERY_CAPTION }));
  const content = value.body.filter((block) => {
    if (block.type === "img") return block.src && !isGalleryImage(block);
    if (block.type === "ul") return block.items.some((item) => item.trim());
    return Boolean((block as { text?: string }).text?.trim());
  });
  const body = [...galleryBlocks, ...content];
  const description =
    content.find((block): block is Extract<BodyBlock, { type: "p" }> => block.type === "p")?.text ?? "";
  return {
    clubId: value.clubId,
    newClubName: value.newClubName.trim(),
    title: value.title.trim(),
    subtitle: value.subtitle.trim(),
    category: value.category,
    city: value.city,
    venue: value.venue.trim(),
    address: value.address.trim() || value.venue.trim(),
    lat: value.lat,
    lng: value.lng,
    startsAt: new Date(value.startsAt).toISOString(),
    endsAt: new Date(value.endsAt).toISOString(),
    price: Number(value.price) || 0,
    capacity: Number(value.capacity) || 12,
    coverUrl,
    hostNote: "",
    highlights: value.highlights.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 8),
    level: "all" as const,
    body,
    description,
    refundHours: Number(value.refundHours) || 24,
    refundFeePercent: Number(value.refundFeePercent) || 50,
  };
}
