const FALLBACK_PUBLIC_URL = "https://jom-chumen-2026.vercel.app";

function normalizePublicOrigin(raw?: string | null) {
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase();
    if (host === "example.com" || host.endsWith(".example.com")) return "";
    if (host.includes("grok") && host.includes("sandbox")) return "";
    if (host.includes("-git-") && host.endsWith(".vercel.app")) return "";
    return url.origin.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export function publicSiteUrl() {
  const explicit = normalizePublicOrigin(process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL);
  if (explicit) return explicit;

  const vercelProduction = normalizePublicOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelProduction) return vercelProduction;

  if (process.env.VERCEL_ENV === "production" || !process.env.VERCEL_ENV) {
    const authOrigin = normalizePublicOrigin(process.env.BETTER_AUTH_URL);
    if (authOrigin) return authOrigin;
  }
  return FALLBACK_PUBLIC_URL;
}

export function eventShareUrl(slug: string) {
  return `${publicSiteUrl()}/events/${slug}`;
}

export function eventOgImageUrl(slug: string) {
  return `${publicSiteUrl()}/api/og/${slug}?v=8`;
}

export function ticketVerifyUrl(token: string) {
  return `${publicSiteUrl()}/verify/${encodeURIComponent(token)}`;
}
