import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CITY_COORDS } from "@/lib/geo";
import type { CityId } from "@/lib/types";

export type PlaceHit = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

const searchSchema = z.object({
  query: z.string().trim().min(2).max(80),
  city: z.enum(["penang", "kl", "jb", "singapore", "bangkok"]).optional(),
});

export const searchPlaces = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchSchema.parse(data))
  .handler(async ({ data }): Promise<PlaceHit[]> => {
    const bias = data.city ? CITY_COORDS[data.city as Exclude<CityId, "all">] : null;
    const photon = await fromPhoton(data.query, bias);
    if (photon.length) return photon;
    return fromNominatim(data.query, bias);
  });

async function fromPhoton(
  query: string,
  bias: { lat: number; lon: number } | null,
): Promise<PlaceHit[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "default");
  if (bias) {
    url.searchParams.set("lat", String(bias.lat));
    url.searchParams.set("lon", String(bias.lon));
  }
  const json = await fetchJson<{
    features?: Array<{
      geometry?: { coordinates?: number[] };
      properties?: Record<string, unknown>;
    }>;
  }>(url);
  if (!json?.features) return [];
  const hits: PlaceHit[] = [];
  for (const feature of json.features) {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const p = feature.properties ?? {};
    const name = String(p.name || p.street || "").trim();
    if (!name) continue;
    const parts = [
      p.housenumber,
      p.street,
      p.district,
      p.locality || p.city,
      p.state,
      p.country,
    ]
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    const address = [...new Set(parts)].join(", ");
    hits.push({
      name: name.slice(0, 80),
      address: (address || name).slice(0, 200),
      lat,
      lng,
    });
  }
  return hits;
}

async function fromNominatim(
  query: string,
  bias: { lat: number; lon: number } | null,
): Promise<PlaceHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  if (bias) {
    url.searchParams.set("viewbox", `${bias.lon - 0.4},${bias.lat + 0.4},${bias.lon + 0.4},${bias.lat - 0.4}`);
    url.searchParams.set("bounded", "0");
  }
  const json = await fetchJson<
    Array<{
      lat?: string;
      lon?: string;
      name?: string;
      display_name?: string;
    }>
  >(url);
  if (!Array.isArray(json)) return [];
  return json
    .map((row) => {
      const lat = Number(row.lat);
      const lng = Number(row.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const name = (row.name || row.display_name || "").split(",")[0]?.trim() || "";
      if (!name) return null;
      return {
        name: name.slice(0, 80),
        address: String(row.display_name || name).slice(0, 200),
        lat,
        lng,
      };
    })
    .filter((row): row is PlaceHit => Boolean(row));
}

async function fetchJson<T>(url: URL): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "JomChumen/1.0 (event place search)",
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
