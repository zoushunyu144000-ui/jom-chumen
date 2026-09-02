import { betterAuth } from "better-auth";
import { bearer, genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { GATE_PROVIDER_ID, gateIdentitySessions } from "./gate-session.server";
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

export const authConfigured =
  !authDisabled && Boolean((grokClientId && grokClientSecret) || googleEnabled || emailAndPasswordEnabled);

function publicDeployUrl(): string | undefined {
  const raw = env("BETTER_AUTH_URL");
  if (raw && !/example\.com/i.test(raw)) return raw.replace(/\/+$/, "");
  const prod = env("VERCEL_PROJECT_PRODUCTION_URL");
  if (prod) return prod.startsWith("http") ? prod.replace(/\/+$/, "") : `https://${prod}`;
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
  "https://jom-chumen-2026.vercel.app",
  "https://jom-chumen-2026-zuriel144000.vercel.app",
];
const baseURL = explicitBaseURL ?? {
  allowedHosts: [...previewAllowedHosts, "*.vercel.app", "localhost", "127.0.0.1", "[::1]"],
  protocol: "auto" as const,
  fallback: "http://localhost:8080",
};

const trustedOrigins: string[] = [
  ...(explicitBaseURL ? [explicitBaseURL] : []),
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

export const SESSION_TOKEN_COOKIE = "__Host-grok-auth.session_token";

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
  session: { cookieCache: { enabled: true, maxAge: 300 } },
  ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),
  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-grok-auth.session_data" },
      account_data: { name: "__Host-grok-auth.account_data" },
      dont_remember: { name: "__Host-grok-auth.dont_remember" },
    },
  },
  plugins: [
    gateIdentitySessions(),
    ...(grokOAuthPlugin ? [grokOAuthPlugin] : []),
    bearer(),
    tanstackStartCookies(),
  ],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}

export { GROK_PROVIDERS } from "./providers";
