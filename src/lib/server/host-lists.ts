import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureAppSchema } from "@/lib/server/schema";

export type HostEventCard = {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  currency: "MYR" | "SGD" | "THB";
  booked: number;
  capacity: number;
  coverUrl: string;
  open: boolean;
};

export const listHostEventCards = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<HostEventCard[]> => {
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      slug: string;
      title: string;
      starts_at: string | Date;
      currency: string;
      capacity: number;
      open: boolean | null;
      booked: number | string | null;
    }>`
      select e.id, e.slug, e.title, e.starts_at, e.currency, e.capacity, e.open,
        coalesce(r.paid_seats, 0) as booked
      from events e
      left join (
        select event_id, sum(seats)::int as paid_seats
        from registrations
        where payment_status in ('approved', 'paid', 'pending')
        group by event_id
      ) r on r.event_id = e.id
      where e.user_id = ${context.userId}
      order by e.starts_at desc
    `;
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      startsAt: new Date(row.starts_at).toISOString(),
      currency: row.currency as HostEventCard["currency"],
      booked: Number(row.booked) || 0,
      capacity: Number(row.capacity) || 0,
      coverUrl: `/api/media/${row.slug}?kind=cover`,
      open: row.open !== false,
    }));
  });

export const listMyClubCards = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureAppSchema();
    const sql = await getSql();
    await sql`
      insert into club_members (club_id, user_id, role)
      select id, user_id, 'owner' from clubs
      where user_id = ${context.userId}
      on conflict do nothing
    `;
    const owned = await sql<{ id: string; name: string; city: string | null }>`
      select id, name, city from clubs where user_id = ${context.userId}
    `;
    const member = await sql<{ id: string; name: string; city: string | null }>`
      select c.id, c.name, c.city
      from clubs c
      join club_members m on m.club_id = c.id
      where m.user_id = ${context.userId}
    `;
    const fromEvents = await sql<{ id: string; name: string; city: string | null }>`
      select c.id, c.name, c.city
      from clubs c
      join events e on e.club_id = c.id
      where e.user_id = ${context.userId}
    `;
    const counts = await sql<{ club_id: string; n: number }>`
      select club_id, count(*)::int as n from events where club_id is not null group by club_id
    `;
    const nMap = new Map(counts.map((row) => [row.club_id, Number(row.n) || 0]));
    const map = new Map<string, { id: string; name: string; city: string; eventCount: number }>();
    for (const row of [...owned, ...member, ...fromEvents]) {
      if (!row.id || map.has(row.id)) continue;
      map.set(row.id, {
        id: row.id,
        name: row.name,
        city: row.city || "penang",
        eventCount: nMap.get(row.id) ?? 0,
      });
    }
    return [...map.values()];
  });
