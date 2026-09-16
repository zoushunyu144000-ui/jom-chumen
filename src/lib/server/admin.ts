import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureAppSchema } from "@/lib/server/schema";
import { eventSelect, mapEvent, type EventRow } from "@/lib/server/events";
import { pushMessage } from "@/lib/server/messages";
import type { ApplyStatus, EventRecord } from "@/lib/types";

export type ApplyRow = {
  id: string;
  code: string;
  applyNo: string;
  nickname: string;
  phone: string;
  contactWechat: string;
  contactWhatsapp: string;
  seats: number;
  paymentMethod: string;
  status: ApplyStatus;
  amount: number;
  createdAt: string;
  rejectReason: string;
  adminNote: string;
};

async function hostEventFilter(userId: string) {
  await ensureAppSchema();
  return userId;
}

export const pendingHostCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await hostEventFilter(context.userId);
    const sql = await getSql();
    const rows = await sql<{ n: number }>`
      select count(*)::int as n
      from registrations r
      join events e on e.id = r.event_id
      where r.payment_status = 'pending'
        and (
          e.user_id = ${context.userId}
          or e.club_id in (select club_id from club_members where user_id = ${context.userId})
        )
    `;
    return rows[0]?.n ?? 0;
  });

export type InboxRow = ApplyRow & {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
};

export const listHostInbox = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<InboxRow[]> => {
    await hostEventFilter(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      code: string;
      apply_no: string | null;
      nickname: string;
      phone: string;
      contact_wechat: string | null;
      contact_whatsapp: string | null;
      seats: number;
      payment_method: string;
      payment_status: string;
      amount: string | number;
      created_at: string | Date;
      reject_reason: string | null;
      admin_note: string | null;
      event_id: string;
      event_title: string;
      event_slug: string;
    }>`
      select
        r.id, r.code, r.apply_no, r.nickname, r.phone,
        r.contact_wechat, r.contact_whatsapp, r.seats, r.payment_method,
        r.payment_status, r.amount, r.created_at, r.reject_reason, r.admin_note,
        e.id as event_id, e.title as event_title, e.slug as event_slug
      from registrations r
      join events e on e.id = r.event_id
      where r.payment_status = 'pending'
        and (
          e.user_id = ${context.userId}
          or e.club_id in (select club_id from club_members where user_id = ${context.userId})
        )
      order by r.created_at desc
      limit 80
    `;
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      applyNo: row.apply_no || row.code,
      nickname: row.nickname,
      phone: row.phone,
      contactWechat: row.contact_wechat || "",
      contactWhatsapp: row.contact_whatsapp || "",
      seats: Number(row.seats),
      paymentMethod: row.payment_method,
      status: (row.payment_status === "paid" ? "approved" : row.payment_status) as ApplyStatus,
      amount: Number(row.amount) || 0,
      createdAt: new Date(row.created_at).toISOString(),
      rejectReason: row.reject_reason || "",
      adminNote: row.admin_note || "",
      eventId: row.event_id,
      eventTitle: row.event_title,
      eventSlug: row.event_slug,
    }));
  });

export const listHostEvents = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<EventRecord[]> => {
    await hostEventFilter(context.userId);
    const sql = await getSql();
    const rows = await sql.query<EventRow>(
      `${eventSelect.replace("select e.*", "select e.id, e.slug, e.title, e.subtitle, e.category, e.city, e.venue, e.address, e.starts_at, e.ends_at, e.currency, e.price, e.capacity, e.sold, '' as cover_url, left(coalesce(e.description,''),80) as description, e.highlights, e.host_name, e.host_note, e.level, e.club_id, e.user_id, e.open, e.lat, e.lng")}
       where e.user_id = $1
          or e.club_id in (select club_id from club_members where user_id = $1)
       order by e.starts_at desc`,
      [context.userId],
    );
    return rows.map((row) => {
      const event = mapEvent(row);
      return { ...event, coverUrl: `/api/media/${event.slug}?kind=cover`, body: [], wechatQr: "", alipayQr: "", tngQr: "" };
    });
  });

export const listApplications = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      eventId: z.string().min(1),
      status: z.enum(["all", "pending", "approved", "rejected", "cancelled"]).default("all"),
    }).parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<ApplyRow[]> => {
    await hostEventFilter(context.userId);
    const sql = await getSql();
    const owned = await sql<{ id: string }>`
      select id from events
      where id = ${data.eventId}
        and (
          user_id = ${context.userId}
          or club_id in (select club_id from club_members where user_id = ${context.userId})
        )
      limit 1
    `;
    if (!owned[0]) throw new Error("没有这场活动");
    const rows = await sql<{
      id: string; code: string; apply_no: string | null; nickname: string; phone: string;
      contact_wechat: string | null; contact_whatsapp: string | null; seats: number;
      payment_method: string; payment_status: string; amount: string | number;
      created_at: string | Date; reject_reason: string | null; admin_note: string | null;
    }>`
      select id, code, apply_no, nickname, phone, contact_wechat, contact_whatsapp,
             seats, payment_method, payment_status, amount, created_at, reject_reason, admin_note
      from registrations where event_id = ${data.eventId} order by created_at desc
    `;
    return rows
      .map((row) => ({
        id: row.id,
        code: row.code,
        applyNo: row.apply_no || row.code,
        nickname: row.nickname,
        phone: row.phone,
        contactWechat: row.contact_wechat || "",
        contactWhatsapp: row.contact_whatsapp || "",
        seats: Number(row.seats),
        paymentMethod: row.payment_method,
        status: (row.payment_status === "paid" ? "approved" : row.payment_status) as ApplyStatus,
        amount: Number(row.amount) || 0,
        createdAt: new Date(row.created_at).toISOString(),
        rejectReason: row.reject_reason || "",
        adminNote: row.admin_note || "",
      }))
      .filter((row) => (data.status === "all" ? true : row.status === data.status));
  });

export const reviewApplication = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      id: z.string().min(1),
      action: z.enum(["approve", "reject", "note"]),
      reason: z.string().trim().max(200).default(""),
      note: z.string().trim().max(200).default(""),
    }).parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await hostEventFilter(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string; code: string; user_id: string | null; nickname: string; event_id: string; payment_status: string;
    }>`
      select r.id, r.code, r.user_id, r.nickname, r.event_id, r.payment_status
      from registrations r
      join events e on e.id = r.event_id
      where r.id = ${data.id}
        and (
          e.user_id = ${context.userId}
          or e.club_id in (select club_id from club_members where user_id = ${context.userId})
        )
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("找不到这条申请");
    if (data.action === "note") {
      await sql`update registrations set admin_note = ${data.note} where id = ${row.id}`;
      return;
    }
    if (data.action === "reject") {
      if (!data.reason) throw new Error("拒绝必须填写原因");
      await sql`update registrations set payment_status = 'rejected', reject_reason = ${data.reason} where id = ${row.id}`;
      if (row.user_id) {
        await pushMessage({ userId: row.user_id, title: "报名未通过", body: `${data.reason}`, href: `/apply/${row.code}` });
      }
      return;
    }
    await sql`update registrations set payment_status = 'approved' where id = ${row.id}`;
    if (row.user_id) {
      await pushMessage({ userId: row.user_id, title: "报名成功", body: "管理员已确认付款，门票已放入票夹。", href: "/tickets" });
    }
  });

export const getHostEvent = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ eventId: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<EventRecord | null> => {
    await hostEventFilter(context.userId);
    const sql = await getSql();
    const rows = await sql.query<EventRow>(
      `${eventSelect} where e.id = $1 and (e.user_id = $2 or e.club_id in (select club_id from club_members where user_id = $2)) limit 1`,
      [data.eventId, context.userId],
    );
    if (!rows[0]) return null;
    const event = mapEvent(rows[0]);
    return { ...event, coverUrl: `/api/media/${event.slug}?kind=cover` };
  });

export const setEventOpen = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ eventId: z.string().min(1), open: z.boolean() }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await hostEventFilter(context.userId);
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      select id from events
      where id = ${data.eventId}
        and (user_id = ${context.userId} or club_id in (select club_id from club_members where user_id = ${context.userId}))
      limit 1
    `;
    if (!rows[0]) throw new Error("没有这场活动");
    await sql`update events set open = ${data.open} where id = ${data.eventId}`;
  });
