export function publicSiteUrl() {
  const raw =
    process.env.BETTER_AUTH_URL ||
    process.env.VITE_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "")}`
      : "");
  if (raw && !/example\.com/i.test(raw)) return raw.replace(/\/+$/, "");
  return "https://jom-chumen-2026.vercel.app";
}

export function eventShareUrl(slug: string) {
  return `${publicSiteUrl()}/events/${slug}`;
}

export function eventOgImageUrl(slug: string) {
  return `${publicSiteUrl()}/api/og/${slug}?v=4`;
}
