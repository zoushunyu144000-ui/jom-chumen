import { betterAuth } from "better-auth";
import { bearer, genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { GATE_PROVIDER_ID, gateIdentitySessions } from "./gate-session.server";
import { emitOAuthSessionCookie } from "./oauth-session-cookie.server";
import { GROK_PROVIDERS } from "./providers";
import { pgliteDialect } from "./pglite-dialect";
import {
  GROK_ISSUER_DEFAULT,
  PREVIEW_ALLOWED_HOSTS,
  PREVIEW_CLIENT_ID,
  PREVIEW_CLIENT_SECRET,
} from "./preview";

void ensureDbReady();

const globalAuthRef = globalThis as typeof globalThis & {
  __grokAuthPreviewSecret__?: string;
};
function previewAuthSecret(): string {
  globalAuthRef.__grokAuthPreviewSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__grokAuthPreviewSecret__;
}

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const authDisabled = env("VITE_AUTH_ENABLED") === "false";
const onVercel = Boolean(env("VERCEL"));

const grokIssuer = env("GROK_AUTH_ISSUER") ?? GROK_ISSUER_DEFAULT;
const grokClientId = env("GROK_AUTH_CLIENT_ID") ?? (onVercel ? undefined : PREVIEW_CLIENT_ID);
const grokClientSecret =
  env("GROK_AUTH_CLIENT_SECRET") ?? (onVercel ? undefined : PREVIEW_CLIENT_SECRET);

const googleClientId = env("GOOGLE_CLIENT_ID") ?? env("VITE_GOOGLE_CLIENT_ID");
const googleClientSecret = env("GOOGLE_CLIENT_SECRET");
const googleEnabled = Boolean(googleClientId && googleClientSecret);

if (onVercel && !googleEnabled) {
  console.error("[auth] Google OAuth incomplete: need GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
}

export const authConfigured =
  !authDisabled && Boolean((grokClientId && grokClientSecret) || googleEnabled || emailAndPasswordEnabled);

/** Canonical production origin — never derive this from VERCEL_URL. */
const PRODUCTION_SITE_URL = "https://jom-chumen-2026.vercel.app";

function publicDeployUrl(): string | undefined {
  const raw = env("BETTER_AUTH_URL");
  if (raw && !/example\.com/i.test(raw)) return raw.replace(/\/+$/, "");

  const isProduction = env("VERCEL_ENV") === "production";
  const prod = env("VERCEL_PROJECT_PRODUCTION_URL");
  if (prod) {
    return prod.startsWith("http") ? prod.replace(/\/+$/, "") : `https://${prod}`;
  }
  // Production must not fall back to VERCEL_URL (deployment/alias host),
  // or Google redirect_uri drifts off the registered production callback.
  if (isProduction) return PRODUCTION_SITE_URL;

  const vu = env("VERCEL_URL");
  if (vu) return `https://${vu.replace(/^https?:\/\//, "")}`;
  return undefined;
}

const explicitBaseURL = publicDeployUrl();
const previewAllowedHosts: string[] = [...PREVIEW_ALLOWED_HOSTS];
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];
const VERCEL_TRUST: string[] = [
  "https://*.vercel.app",
  "*.vercel.app",
  PRODUCTION_SITE_URL,
  "https://jom-chumen-2026-zuriel144000.vercel.app",
];
const baseURL = explicitBaseURL ?? {
  allowedHosts: [...previewAllowedHosts, "*.vercel.app", "localhost", "127.0.0.1", "[::1]"],
  protocol: "auto" as const,
  fallback: "http://localhost:8080",
};

const trustedOrigins: string[] = [
  PRODUCTION_SITE_URL,
  ...(explicitBaseURL && explicitBaseURL !== PRODUCTION_SITE_URL ? [explicitBaseURL] : []),
  ...VERCEL_TRUST,
  ...previewAllowedHosts,
  ...previewAllowedHosts.flatMap((host) => [`https://${host}`, `http://${host}`]),
  ...LOCAL_DEV_ORIGINS,
];

const databaseUrl = env("DATABASE_URL");
const issuerBase = grokIssuer.replace(/\/+$/, "");

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

// Keep Better Auth's default cookie base name so it matches the working
// __Secure-better-auth.state cookie pattern on Vercel.
export const SESSION_TOKEN_COOKIE = "better-auth.session_token";

const grokOAuthPlugin =
  !authDisabled && grokClientId && grokClientSecret
    ? genericOAuth({
        config: GROK_PROVIDERS.map(({ providerId, idp }) => ({
          providerId,
          clientId: grokClientId,
          clientSecret: grokClientSecret,
          authorizationUrl: `${issuerBase}/api/auth/oauth2/authorize`,
          tokenUrl: `${issuerBase}/api/auth/oauth2/token`,
          userInfoUrl: `${issuerBase}/api/auth/oauth2/userinfo`,
          scopes: ["openid", "profile", "email"],
          authorizationUrlParams: { idp, prompt: "login" },
        })),
      })
    : null;

export const auth = betterAuth({
  baseURL,
  secret: env("BETTER_AUTH_SECRET") ?? previewAuthSecret(),
  database,
  trustedOrigins,
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: googleClientId as string,
          clientSecret: googleClientSecret as string,
        },
      }
    : {},
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: [
        ...GROK_PROVIDERS.map((p) => p.providerId),
        ...(googleEnabled ? ["google"] : []),
        GATE_PROVIDER_ID,
      ],
      requireLocalEmailVerified: false,
    },
  },
  session: { cookieCache: { enabled: false } },
  ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),
  advanced: {
    useSecureCookies: true,
    defaultCookieAttributes: {
      secure: true,
      sameSite: "lax",
      path: "/",
      httpOnly: true,
    },
    cookies: {
      state: { attributes: { maxAge: 60 * 30 } },
    },
  },
  plugins: [
    gateIdentitySessions(),
    emitOAuthSessionCookie(),
    ...(grokOAuthPlugin ? [grokOAuthPlugin] : []),
    bearer(),
    tanstackStartCookies(),
  ],
});

export function readSessionToken(): string | null {
  try {
    return (
      getCookie(`__Secure-${SESSION_TOKEN_COOKIE}`) ??
      getCookie(SESSION_TOKEN_COOKIE) ??
      getCookie("__Secure-jom.session_token") ??
      getCookie("jom.session_token") ??
      getCookie("__Host-grok-auth.session_token") ??
      null
    );
  } catch {
    return null;
  }
}

export { GROK_PROVIDERS } from "./providers";

