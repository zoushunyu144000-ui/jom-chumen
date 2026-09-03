import { CoverPicker } from "@/components/cover-picker";
import { PlacePicker } from "@/components/place-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, EVENT_CITIES } from "@/lib/catalog";
import type { BodyBlock, CategoryId, CityId, ClubRecord } from "@/lib/types";
import { Link } from "@tanstack/react-router";

const MAX_EXTRA = 5;

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

  function setPhoto(i: number, src: string) {
    const photos = [...value.photos];
    photos[i] = src;
    set({ photos: photos.filter(Boolean).slice(0, MAX_EXTRA) });
  }

  function addPhotoSlot(src: string) {
    if (!src || value.photos.length >= MAX_EXTRA) return;
    set({ photos: [...value.photos, src] });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>封面（首图）</Label>
        <p className="mb-2 mt-1 text-xs text-muted">这张会出现在发现列表和详情第一屏。</p>
        <CoverPicker value={value.coverUrl} onChange={(coverUrl) => set({ coverUrl })} label="上传封面" />
      </div>

      <div>
        <Label>更多图片（可选，最多 {MAX_EXTRA} 张）</Label>
        <p className="mb-2 mt-1 text-xs text-muted">详情页可以左右滑动查看。</p>
        <div className="grid grid-cols-3 gap-2">
          {value.photos.map((src, i) => (
            <div key={`${i}-${src.slice(0, 12)}`} className="relative">
              <CoverPicker value={src} onChange={(next) => setPhoto(i, next)} label="换图" />
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] text-lime"
                onClick={() => set({ photos: value.photos.filter((_, j) => j !== i) })}
              >
                删
              </button>
            </div>
          ))}
          {value.photos.length < MAX_EXTRA ? (
            <CoverPicker value="" onChange={addPhotoSlot} label="加图" />
          ) : null}
        </div>
      </div>

      <p className="rounded-lg bg-surface px-3 py-2 text-sm text-muted">
        报名要扫你的收款码、加 WhatsApp。在
        <Link to="/me/host" className="mx-1 underline">收款与客服</Link>
        里设。
      </p>

      {clubs.length > 0 ? (
        <div className="space-y-1.5">
          <Label>俱乐部</Label>
          <NativeSelect value={value.clubId} onChange={(e) => set({ clubId: e.target.value })}>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : allowNewClub ? (
        <div className="space-y-1.5">
          <Label htmlFor="new-club">新俱乐部名称</Label>
          <Input
            id="new-club"
            value={value.newClubName}
            onChange={(e) => set({ newClubName: e.target.value })}
            placeholder="沠有俱乐部的话，这里会一起建"
          />
        </div>
      ) : (
        <p className="text-sm text-muted">先创建俱乐部再编辑活动。</p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title">活动标题</Label>
        <Input
          id="title"
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="比如 周日飞盘局"
          maxLength={40}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="subtitle">一句话介绍</Label>
        <Input
          id="subtitle"
          value={value.subtitle}
          onChange={(e) => set({ subtitle: e.target.value })}
          placeholder="出现在标题下面"
          maxLength={60}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>分类</Label>
          <NativeSelect
            value={value.category}
            onChange={(e) => set({ category: e.target.value as Exclude<CategoryId, "all"> })}
          >
            {eventCategories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label>城市</Label>
          <NativeSelect
            value={value.city}
            onChange={(e) => set({ city: e.target.value as Exclude<CityId, "all"> })}
          >
            {EVENT_CITIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="venue">地点</Label>
        <PlacePicker
          venue={value.venue}
          address={value.address}
          lat={value.lat}
          lng={value.lng}
          city={value.city}
          onChange={(place) => set(place)}
        />
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

      <div className="space-y-1.5">
        <Label htmlFor="desc">活动简介</Label>
        <Textarea
          id="desc"
          value={value.description}
          onChange={(e) => set({ description: e.target.value })}
          rows={5}
          placeholder="这场怎么玩、适合谁来、怎么流程"
        />
      </div>
      <div className="space-y-1.5">
        <Label>活动提醒（每行一条）</Label>
        <Textarea
          value={value.highlights}
          onChange={(e) => set({ highlights: e.target.value })}
          rows={3}
          placeholder={"请穿运动鞋\n自备水杯"}
        />
      </div>

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "保存中…" : submitLabel}
      </Button>
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
}): EventDraft {
  const photos = event.body
    .filter((block): block is Extract<BodyBlock, { type: "img" }> => block.type === "img" && Boolean(block.src))
    .map((block) => block.src)
    .filter((src) => src !== event.coverUrl)
    .slice(0, MAX_EXTRA);
  const description =
    event.description?.trim() ||
    event.body
      .filter((block): block is Extract<BodyBlock, { type: "p" }> => block.type === "p")
      .map((block) => block.text.trim())
      .filter(Boolean)
      .join("\n\n");
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
    coverUrl: event.coverUrl,
    photos,
    description,
    hostNote: "",
    highlights: event.highlights.join("\n"),
    body: event.body.length ? event.body : [{ type: "p", text: "" }],
  };
}

export function parseEventDraft(value: EventDraft) {
  const description = value.description.trim();
  const photos = value.photos.filter(Boolean).slice(0, MAX_EXTRA);
  const body: BodyBlock[] = [
    ...photos.map((src) => ({ type: "img" as const, src, caption: "" })),
    ...(description ? [{ type: "p" as const, text: description }] : []),
  ];
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
    coverUrl: value.coverUrl,
    hostNote: "",
    highlights: value.highlights
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 8),
    level: "all" as const,
    body,
    description,
  };
}
