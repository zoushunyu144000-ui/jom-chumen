import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureAppSchema } from "@/lib/server/schema";
import { makeId } from "@/lib/utils";

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
    try {
      await sql`
        insert into club_members (club_id, user_id, role)
        select id, user_id, 'owner' from clubs
        where user_id = ${context.userId}
        on conflict do nothing
      `;
    } catch {
      /* ignore */
    }

    const owned = await sql<{ id: string; name: string; city: string | null }>`
      select id, name, city from clubs where user_id = ${context.userId}
    `;
    let member: { id: string; name: string; city: string | null }[] = [];
    try {
      member = await sql`
        select c.id, c.name, c.city
        from clubs c
        join club_members m on m.club_id = c.id
        where m.user_id = ${context.userId}
      `;
    } catch {
      member = [];
    }
    let fromEvents: { id: string; name: string; city: string | null }[] = [];
    try {
      fromEvents = await sql`
        select c.id, c.name, c.city
        from clubs c
        join events e on e.club_id = c.id
        where e.user_id = ${context.userId}
      `;
    } catch {
      fromEvents = [];
    }

    const map = new Map<string, { id: string; name: string; city: string; eventCount: number }>();
    for (const row of [...owned, ...member, ...fromEvents]) {
      if (!row.id || map.has(row.id)) continue;
      map.set(row.id, { id: row.id, name: row.name, city: row.city || "penang", eventCount: 0 });
    }

    if (map.size === 0) {
      const orphan = await sql<{ n: number }>`select count(*)::int as n from events where user_id = ${context.userId}`;
      if (Number(orphan[0]?.n) > 0) {
        const id = makeId("club");
        await sql`
          insert into clubs (id, user_id, name, bio, city, cover_url)
          values (${id}, ${context.userId}, ${"我的俱乐部"}, ${""}, ${"penang"}, ${""})
        `;
        await sql`update events set club_id = ${id} where user_id = ${context.userId} and (club_id is null or club_id = '')`;
        try {
          await sql`insert into club_members (club_id, user_id, role) values (${id}, ${context.userId}, ${"owner"}) on conflict do nothing`;
        } catch {
          /* ignore */
        }
        map.set(id, { id, name: "我的俱乐部", city: "penang", eventCount: Number(orphan[0].n) || 0 });
      }
    }

    const counts = await sql<{ club_id: string; n: number }>`
      select club_id, count(*)::int as n from events where club_id is not null group by club_id
    `;
    const nMap = new Map(counts.map((row) => [row.club_id, Number(row.n) || 0]));
    return [...map.values()].map((club) => ({
      ...club,
      eventCount: nMap.get(club.id) ?? club.eventCount,
    }));
  });
