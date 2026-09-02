import { useEffect, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { mapsEmbedUrl, mapsOpenUrl } from "@/lib/geo";
import { searchPlaces, type PlaceHit } from "@/lib/server/places";
import type { CityId } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlacePicker({
  venue,
  address,
  lat,
  lng,
  city,
  onChange,
}: {
  venue: string;
  address: string;
  lat: number | null;
  lng: number | null;
  city: Exclude<CityId, "all">;
  onChange: (next: {
    venue: string;
    address: string;
    lat: number | null;
    lng: number | null;
  }) => void;
}) {
  const [query, setQuery] = useState(venue);
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [pickedName, setPickedName] = useState(lat != null ? venue : "");
  const picked = lat != null && lng != null;

  useEffect(() => {
    setQuery(venue);
    if (lat != null) setPickedName(venue);
  }, [venue, lat]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || q === pickedName) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      setBusy(true);
      searchPlaces({ data: { query: q, city } })
        .then((rows) => setHits(rows))
        .catch(() => setHits([]))
        .finally(() => setBusy(false));
    }, 320);
    return () => window.clearTimeout(t);
  }, [query, city, pickedName]);

  function pick(hit: PlaceHit) {
    setHits([]);
    setQuery(hit.name);
    setPickedName(hit.name);
    onChange({
      venue: hit.name,
      address: hit.address,
      lat: hit.lat,
      lng: hit.lng,
    });
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          id="venue"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange({
              venue: e.target.value,
              address,
              lat: null,
              lng: null,
            });
          }}
          placeholder="搜地点，例如 Gurney / 白沙海滩"
          required
          className="pl-10"
          autoComplete="off"
        />
      </div>
      {busy ? <p className="text-xs text-muted">正在搜真实地点…</p> : null}
      {hits.length > 0 ? (
        <ul className="overflow-hidden rounded-xl bg-surface shadow-card">
          {hits.map((hit) => (
            <li key={`${hit.lat},${hit.lng},${hit.name}`}>
              <button
                type="button"
                onClick={() => pick(hit)}
                className="flex min-h-14 w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-paper-2"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                <span>
                  <span className="block font-medium">{hit.name}</span>
                  <span className="mt-0.5 block text-xs text-muted">{hit.address}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {picked ? (
        <>
          {address && address !== venue ? (
            <p className="text-xs text-muted">{address}</p>
          ) : null}
          <EventMap lat={lat} lng={lng} label={venue} />
        </>
      ) : (
        <p className="text-xs text-muted">从列表里点一个，地图会按谷歌地图定位。</p>
      )}
    </div>
  );
}

export function EventMap({
  lat,
  lng,
  label,
  className,
}: {
  lat: number;
  lng: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-surface shadow-card", className)}>
      <iframe
        title="谷歌地图"
        src={mapsEmbedUrl(lat, lng, label)}
        className="aspect-video w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={mapsOpenUrl(lat, lng, label)}
        target="_blank"
        rel="noreferrer"
        className="flex h-11 items-center justify-center text-sm font-medium"
      >
        在谷歌地图打开导航
      </a>
    </div>
  );
}
