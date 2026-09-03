import type { ProfileRecord } from "@/lib/types";

const KEY = "jom-profile-v1";

export function readProfileCache(): ProfileRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileRecord;
    if (!parsed || typeof parsed.displayName !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeProfileCache(profile: ProfileRecord) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* quota */
  }
}
