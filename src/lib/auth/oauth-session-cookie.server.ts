import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { parseSetCookieHeader } from "better-auth/cookies";

/**
 * TanStack Start sometimes drops Better Auth's Set-Cookie bag on the OAuth
 * callback redirect, so Google login creates a session in the DB but the
 * browser never stores it. Sign and emit the session cookie ourselves.
 */
export function emitOAuthSessionCookie() {
  return {
    id: "jom-oauth-session-cookie",
    hooks: {
      after: [
        {
          matcher: (ctx: { path?: string }) =>
            typeof ctx.path === "string" && ctx.path.includes("callback"),
          handler: createAuthMiddleware(async (ctx) => {
            const token = ctx.context.newSession?.session?.token;
            if (!token) return;
            const sessionTokenName = ctx.context.authCookies.sessionToken.name;
            const attributes = ctx.context.authCookies.sessionToken.attributes;
            const maxAge = ctx.context.sessionConfig.expiresIn;
            let signedCookie: string;
            try {
              signedCookie = await ctx.setSignedCookie(
                sessionTokenName,
                token,
                ctx.context.secret,
                { ...attributes, maxAge, domain: undefined },
              );
            } catch (err) {
              console.error("[oauth-cookie] setSignedCookie failed", err);
              return;
            }
            const sessionValue = parseSetCookieHeader(signedCookie).get(
              sessionTokenName,
            )?.value;
            if (!sessionValue) return;
            try {
              const { setCookie } = await import("@tanstack/react-start/server");
              setCookie(sessionTokenName, sessionValue, {
                path: "/",
                httpOnly: true,
                secure: true,
                sameSite: "lax",
                maxAge: typeof maxAge === "number" ? maxAge : undefined,
              });
            } catch (err) {
              console.error("[oauth-cookie] TanStack setCookie failed", err);
            }
            try {
              ctx.context.responseHeaders?.append("set-cookie", signedCookie);
            } catch (err) {
              console.error("[oauth-cookie] responseHeaders.append failed", err);
            }
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}
