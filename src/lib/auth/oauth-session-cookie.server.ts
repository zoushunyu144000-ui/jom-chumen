import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { parseSetCookieHeader } from "better-auth/cookies";

/**
 * Emit the signed session cookie through TanStack Start whenever a new
 * session is created (Google callback, email sign-in, etc.). TanStack Start
 * sometimes drops Better Auth's Set-Cookie bag on 302 redirects.
 */
export function emitOAuthSessionCookie() {
  return {
    id: "jom-oauth-session-cookie",
    hooks: {
      after: [
        {
          matcher: () => true,
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
                {
                  ...attributes,
                  maxAge,
                  path: "/",
                  httpOnly: true,
                  secure: true,
                  sameSite: "lax",
                  domain: undefined,
                },
              );
            } catch (err) {
              console.error("[oauth-cookie] setSignedCookie failed", err);
              return;
            }

            const sessionValue = parseSetCookieHeader(signedCookie).get(
              sessionTokenName,
            )?.value;
            if (!sessionValue) {
              console.error("[oauth-cookie] signed cookie missing token value");
              return;
            }

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

            console.info("[oauth-cookie] emitted session cookie", {
              path: ctx.path,
              name: sessionTokenName,
            });
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}
