import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { EVENT_SEED, CLUB_SEED } from "@/lib/catalog";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureVerifyToken, verifyTicketUrl } from "@/lib/server/apply-no";
import { ensureAppSchema } from "@/lib/server/schema";
import { maskPhone } from "@/lib/utils";
import type {
  ApplyStatus,
  BodyBlock,
  CategoryId,
  CityId,
  Currency,
  EventRecord,
  EventStatus,
  PaymentMethod,
  TicketRecord,
} from "@/lib/types";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  city: string;
  venue: string;
  address: string;
  lat?: number | string | null;
  lng?: number | string | null;
  starts_at: string | Date;
  ends_at: string | Date;
  currency: string;
  price: string | number;
  capacity: number;
  sold: number;
  cover_url: string;
  description: string;
  highlights: string;
  host_name: string;
  host_note: string;
  level: string;
  paid_seats: number | string | null;
  body?: string | null;
  club_id?: string | null;
  club_name?: string | null;
  user_id?: string | null;
  open?: boolean | null;
  status?: string | null;
  cancel_reason?: string | null;
  whatsapp?: string | null;
  wechat_qr?: string | null;
  alipay_qr?: string | null;
  tng_qr?: string | null;
};

function toIso(value: string | Date) {
  return new Date(value).toISOString();
}

function toCoord(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseBody(raw: string | null | undefined): BodyBlock[] {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((block): block is BodyBlock => {
      if (!block || typeof block !== "object") return false;
      const type = (block as BodyBlock).type;
      return type === "h" || type === "p" || type === "quote" || type === "ul" || type === "img";
    });
  } catch {
    return [];
  }
}

function mapEvent(row: EventRow): EventRecord {
  const sold = Number(row.sold) || 0;
  const paid = Number(row.paid_seats) || 0;
  const capacity = Number(row.capacity) || 0;
  const booked = sold + paid;
  let highlights: string[] = [];
  try {
    const parsed = JSON.parse(row.highlights || "[]") as unknown;
    if (Array.isArray(parsed)) highlights = parsed.map(String);
  } catch {
    highlights = [];
  }
  const status = (row.status as EventStatus) || (row.open === false ? "closed" : "published");
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category as EventRecord["category"],
    city: row.city as EventRecord["city"],
    venue: row.venue,
    address: row.address,
    lat: toCoord(row.lat),
    lng: toCoord(row.lng),
    startsAt: toIso(row.starts_at),
    endsAt: toIso(row.ends_at),
    currency: row.currency as Currency,
    price: Number(row.price) || 0,
    capacity,
    sold,
    booked,
    remaining: Math.max(0, capacity - booked),
    coverUrl: row.cover_url,
    description: row.description,
    highlights,
    hostName: row.host_name,
    hostNote: row.host_note,
    level: row.level as EventRecord["level"],
    body: parseBody(row.body),
    clubId: row.club_id ?? null,
    clubName: row.club_name ?? null,
    userId: row.user_id ?? null,
    open: row.open !== false && status !== "cancelled",
    status,
    cancelReason: row.cancel_reason || "",
    whatsapp: row.whatsapp || "601135550088",
    wechatQr: row.wechat_qr || "/pay/wechat.svg",
    alipayQr: row.alipay_qr || "/pay/alipay.svg",
    tngQr: row.tng_qr || "/pay/tng.svg",
  };
}

const eventSelect = `
  select e.*, c.name as club_name, coalesce(r.paid_seats, 0) as paid_seats
  from events e
  left join clubs c on c.id = e.club_id
  left join (
    select event_id, sum(seats)::int as paid_seats
    from registrations
    where payment_status in ('approved', 'paid')
    group by event_id
  ) r on r.event_id = e.id
`;

async function ensureSeeded() {
  const sql = await getSql();
  for (const event of EVENT_SEED) {
    const exists = await sql<{ id: string }>`select id from events where id = ${event.id} limit 1`;
    if (exists[0]) continue;
    await sql`insert into events (
        id, slug, title, subtitle, category, city, venue, address,
        starts_at, ends_at, currency, price, capacity, sold, cover_url,
        description, highlights, host_name, host_note, level
      ) values (
        ${event.id}, ${event.slug}, ${event.title}, ${event.subtitle},
        ${event.category}, ${event.city}, ${event.venue}, ${event.address},
        ${event.startsAt}, ${event.endsAt}, ${event.currency}, ${event.price},
        ${event.capacity}, ${event.sold}, ${event.coverUrl}, ${event.description},
        ${JSON.stringify(event.highlights)}, ${event.hostName}, ${event.hostNote},
        ${event.level}
      )`;
  }
  for (const club of CLUB_SEED) {
    const exists = await sql<{ id: string }>`select id from clubs where id = ${club.id} limit 1`;
    if (!exists[0]) {
      await sql`insert into clubs (id, user_id, name, bio, city, cover_url) values (${club.id}, ${"seed"}, ${club.name}, ${club.bio}, ${club.city}, ${club.coverUrl})`;
    }
    for (const slug of club.eventSlugs) {
      await sql`update events set club_id = ${club.id}, host_name = ${club.name} where slug = ${slug} and (club_id is null or club_id = ${club.id})`;
    }
  }
  await sql`update events set
      whatsapp = case when whatsapp is null or whatsapp = '' then '601135550088' else whatsapp end,
      wechat_qr = case when wechat_qr is null or wechat_qr = '' then '/pay/wechat.svg' else wechat_qr end,
      alipay_qr = case when alipay_qr is null or alipay_qr = '' then '/pay/alipay.svg' else alipay_qr end,
      tng_qr = case when tng_qr is null or tng_qr = '' then '/pay/tng.svg' else tng_qr end`;
}

const listSchema = z.object({ city: z.string().optional(), category: z.string().optional(), query: z.string().optional(), clubId: z.string().optional() });

export const listEvents = createServerFn({ method: "GET" })
  .validator((data: unknown) => listSchema.parse(data ?? {}))
  .handler(async ({ data }) => {
    await ensureSeeded();
    const sql = await getSql();
    const rows = await sql.query<EventRow>(`${eventSelect} order by e.starts_at asc`);
    const city = (data.city ?? "all") as CityId;
    const category = (data.category ?? "all") as CategoryId;
    const query = (data.query ?? "").trim().toLowerCase();
    return rows.map(mapEvent)
      .filter((event) => event.status !== "cancelled")
      .filter((event) => (data.clubId ? event.clubId === data.clubId : true))
      .filter((event) => (city === "all" ? true : event.city === city))
      .filter((event) => (category === "all" ? true : event.category === category))
      .filter((event) => {
        if (!query) return true;
        return `${event.title} ${event.subtitle} ${event.venue} ${event.hostName} ${event.clubName ?? ""}`.toLowerCase().includes(query);
      })
      .map((event) => ({ ...event, body: [], description: (event.description || "").slice(0, 180), wechatQr: "", alipayQr: "", tngQr: "" }));
  });

export const getEventBySlug = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    await ensureSeeded();
    const sql = await getSql();
    const rows = await sql.query<EventRow>(`${eventSelect} where e.slug = $1 limit 1`, [data.slug]);
    return rows[0] ? mapEvent(rows[0]) : null;
  });

type RegRow = {
  id: string;
  code: string;
  apply_no: string | null;
  nickname: string;
  phone: string;
  seats: number;
  payment_method: string;
  payment_status: string;
  amount: string | number;
  currency: string;
  created_at: string | Date;
  event_id: string;
  user_id?: string | null;
  reject_reason?: string | null;
  cancel_reason?: string | null;
  contact_wechat?: string | null;
  contact_whatsapp?: string | null;
  verify_token?: string | null;
};

async function mapOwnedTicket(row: RegRow, event: EventRecord): Promise<TicketRecord> {
  const sql = await getSql();
  const token = await ensureVerifyToken(sql, row.id, row.verify_token);
  return {
    id: row.id,
    code: row.code,
    applyNo: row.apply_no || row.code,
    nickname: row.nickname,
    phoneMasked: maskPhone(row.phone),
    seats: Number(row.seats),
    paymentMethod: row.payment_method as PaymentMethod | "free",
    paymentStatus: row.payment_status as ApplyStatus,
    amount: Number(row.amount) || 0,
    currency: row.currency as Currency,
    createdAt: toIso(row.created_at),
    rejectReason: row.reject_reason || "",
    cancelReason: row.cancel_reason || "",
    contactWechat: row.contact_wechat || "",
    contactWhatsapp: row.contact_whatsapp || "",
    verifyUrl: verifyTicketUrl(token),
    event,
  };
}

export const lookupApplication = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: unknown) => z.object({ code: z.string().trim().min(3).optional() }).parse(data ?? {}))
  .handler(async ({ context, data }) => {
    await ensureSeeded();
    await ensureAppSchema();
    const sql = await getSql();
    const code = (data.code || "").trim();
    const rows = code
      ? await sql<RegRow>`
          select * from registrations
          where user_id = ${context.userId} and (code = ${code} or apply_no = ${code})
          order by created_at desc
        `
      : await sql<RegRow>`
          select * from registrations
          where user_id = ${context.userId}
          order by created_at desc
          limit 40
        `;
    const out: TicketRecord[] = [];
    for (const row of rows) {
      const eventRows = await sql.query<EventRow>(`${eventSelect} where e.id = $1 limit 1`, [row.event_id]);
      if (eventRows[0]) out.push(await mapOwnedTicket(row, mapEvent(eventRows[0])));
    }
    return out;
  });

export const getTicketByCode = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: unknown) => z.object({ code: z.string().min(3) }).parse(data))
  .handler(async ({ context, data }): Promise<TicketRecord | null> => {
    await ensureSeeded();
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql<RegRow>`
      select * from registrations
      where user_id = ${context.userId} and (code = ${data.code} or apply_no = ${data.code})
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    const eventRows = await sql.query<EventRow>(`${eventSelect} where e.id = $1 limit 1`, [row.event_id]);
    if (!eventRows[0]) return null;
    return mapOwnedTicket(row, mapEvent(eventRows[0]));
  });

export const listMyApplications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TicketRecord[]> => {
    await ensureSeeded();
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql<RegRow>`select * from registrations where user_id = ${context.userId} order by created_at desc`;
    const out: TicketRecord[] = [];
    for (const row of rows) {
      const eventRows = await sql.query<EventRow>(`${eventSelect} where e.id = $1 limit 1`, [row.event_id]);
      if (eventRows[0]) out.push(await mapOwnedTicket(row, mapEvent(eventRows[0])));
    }
    return out;
  });

export const cancelApplication = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => z.object({ code: z.string().min(3) }).parse(data))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string; payment_status: string }>`
      select id, payment_status from registrations
      where user_id = ${context.userId} and (code = ${data.code} or apply_no = ${data.code})
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("找不到这条申请");
    if (row.payment_status !== "pending") throw new Error("只能取消待确认的申请");
    await sql`update registrations set payment_status = 'cancelled', cancelled_at = now(), cancelled_by = ${context.userId}, cancel_reason = ${"用户取消"} where id = ${row.id}`;
  });

export { ensureSeeded, eventSelect, mapEvent };
export type { EventRow };
