import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

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
        where payment_status in ('approved', 'paid')
        group by event_id
      ) r on r.event_id = e.id
      where e.user_id = ${context.userId}
         or e.club_id in (select club_id from club_members where user_id = ${context.userId})
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
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      name: string;
      city: string;
      event_count: number | string | null;
    }>`
      select c.id, c.name, c.city, coalesce(e.n, 0) as event_count
      from clubs c
      left join (
        select club_id, count(*)::int as n from events where club_id is not null group by club_id
      ) e on e.club_id = c.id
      where c.user_id = ${context.userId}
         or c.id in (select club_id from club_members where user_id = ${context.userId})
      order by c.created_at desc
    `;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      eventCount: Number(row.event_count) || 0,
    }));
  });
