import type { CityId } from "@/lib/types";

export const CITY_COORDS: Record<Exclude<CityId, "all">, { lat: number; lon: number }> = {
  penang: { lat: 5.4141, lon: 100.3288 },
  kl: { lat: 3.139, lon: 101.6869 },
  jb: { lat: 1.4927, lon: 103.7414 },
  singapore: { lat: 1.3521, lon: 103.8198 },
  bangkok: { lat: 13.7563, lon: 100.5018 },
};

export function mapsEmbedUrl(lat: number, lng: number, label?: string) {
  const q = label ? `${label}@${lat},${lng}` : `${lat},${lng}`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&hl=zh-CN&z=16&output=embed`;
}

export function mapsOpenUrl(lat: number, lng: number, label?: string) {
  const q = label ? `${label} ${lat},${lng}` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
