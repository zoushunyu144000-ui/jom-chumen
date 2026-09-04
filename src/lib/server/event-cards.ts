import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { mapEvent, type EventRow } from "@/lib/server/events";
import type { EventRecord } from "@/lib/types";

const cardSelect = `
  select
    e.id, e.slug, e.title, e.subtitle, e.category, e.city, e.venue, e.address,
    e.starts_at, e.ends_at, e.currency, e.price, e.capacity, e.sold,
    '' as cover_url,
    left(coalesce(e.description, ''), 80) as description,
    '[]' as highlights,
    e.host_name, '' as host_note, e.level, e.club_id, e.user_id, e.open,
    coalesce(e.status,'published') as status,
    e.lat, e.lng, c.name as club_name,
    coalesce(r.paid_seats, 0) as paid_seats
  from events e
  left join clubs c on c.id = e.club_id
  left join (
    select event_id, sum(seats)::int as paid_seats
    from registrations
    where payment_status in ('approved', 'paid')
    group by event_id
  ) r on r.event_id = e.id
`;

export const listEventCards = createServerFn({ method: "GET" }).handler(
  async (): Promise<EventRecord[]> => {
    const sql = await getSql();
    const rows = await sql.query<EventRow>(`${cardSelect} order by e.starts_at asc limit 60`);
    return rows
      .map((row) => {
        const event = mapEvent(row);
        return {
          ...event,
          coverUrl: `/api/media/${event.slug}?kind=cover`,
          body: [],
          wechatQr: "",
          alipayQr: "",
          tngQr: "",
          whatsapp: "",
        };
      })
      .filter((event) => event.status !== "cancelled");
  },
);
