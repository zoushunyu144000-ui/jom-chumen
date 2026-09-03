import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
import { loadEventMetaBySlug } from "@/lib/server/event-meta";

export const getPublicEvent = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const event = await loadEventMetaBySlug(data.slug);
    if (!event) return null;
    let myApply: { status: string; code: string } | null = null;
    try {
      const user = await getSessionUser();
      if (user) {
        const sql = await getSql();
        const rows = await sql<{ payment_status: string; code: string }>`
          select payment_status, code from registrations
          where event_id = ${event.id} and user_id = ${user.id}
            and payment_status in ('pending', 'approved', 'paid')
          order by created_at desc limit 1
        `;
        if (rows[0]) myApply = { status: rows[0].payment_status, code: rows[0].code };
      }
    } catch {
      myApply = null;
    }
    return { ...event, myApply };
  });
