import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
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

export const pendingHostCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ n: number }>`
      select count(*)::int as n
      from registrations r
      join events e on e.id = r.event_id
      where e.user_id = ${context.userId}
        and r.payment_status = 'pending'
    `;
    return rows[0]?.n ?? 0;
  });

export type InboxRow = ApplyRow & {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
};

export const listHostInbox = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<InboxRow[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      code: string;
      apply_no: string | null;
      nickname: string;
      phone: string;
      contact_wechat: string;
      contact_whatsapp: string;
      seats: number;
      payment_method: string;
      payment_status: string;
      amount: string | number;
      created_at: string | Date;
      reject_reason: string;
      admin_note: string;
      event_id: string;
      event_title: string;
      event_slug: string;
    }>`
      select
        r.*,
        e.title as event_title,
        e.slug as event_slug
      from registrations r
      join events e on e.id = r.event_id
      where e.user_id = ${context.userId}
        and r.payment_status = 'pending'
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

export const listHostEvents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<EventRecord[]> => {
    const sql = await getSql();
    const rows = await sql.query<EventRow>(
      `${eventSelect} where e.user_id = $1 order by e.starts_at desc`,
      [context.userId],
    );
    return rows.map(mapEvent);
  });

export const listApplications = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({
        eventId: z.string().min(1),
        status: z.enum(["all", "pending", "approved", "rejected", "cancelled"]).default("all"),
      })
      .parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<ApplyRow[]> => {
    const sql = await getSql();
    const owned = await sql<{ id: string }>`
      select id from events where id = ${data.eventId} and user_id = ${context.userId} limit 1
    `;
    if (!owned[0]) throw new Error("没有这场活动");
    const rows = await sql<{
      id: string;
      code: string;
      apply_no: string | null;
      nickname: string;
      phone: string;
      contact_wechat: string;
      contact_whatsapp: string;
      seats: number;
      payment_method: string;
      payment_status: string;
      amount: string | number;
      created_at: string | Date;
      reject_reason: string;
      admin_note: string;
    }>`
      select * from registrations
      where event_id = ${data.eventId}
      order by created_at desc
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
    z
      .object({
        id: z.string().min(1),
        action: z.enum(["approve", "reject", "note"]),
        reason: z.string().trim().max(200).default(""),
        note: z.string().trim().max(200).default(""),
      })
      .parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      code: string;
      user_id: string | null;
      nickname: string;
      event_id: string;
      payment_status: string;
    }>`
      select r.id, r.code, r.user_id, r.nickname, r.event_id, r.payment_status
      from registrations r
      join events e on e.id = r.event_id
      where r.id = ${data.id} and e.user_id = ${context.userId}
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("找不到这条申请");

    if (data.action === "note") {
      await sql`
        update registrations set admin_note = ${data.note} where id = ${row.id}
      `;
      return;
    }
    if (data.action === "reject") {
      if (!data.reason) throw new Error("拒绝必须填写原因");
      await sql`
        update registrations
        set payment_status = 'rejected', reject_reason = ${data.reason}
        where id = ${row.id}
      `;
      if (row.user_id) {
        await pushMessage({
          userId: row.user_id,
          title: "报名未通过",
          body: `${data.reason}`,
          href: `/apply/${row.code}`,
        });
      }
      return;
    }
    await sql`
      update registrations
      set payment_status = 'approved'
      where id = ${row.id}
    `;
    if (row.user_id) {
      await pushMessage({
        userId: row.user_id,
        title: "报名成功",
        body: "管理员已确认付款，门票已放入票夹。",
        href: "/tickets",
      });
    }
  });

export const getHostEvent = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ eventId: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<EventRecord | null> => {
    const sql = await getSql();
    const rows = await sql.query<EventRow>(
      `${eventSelect} where e.id = $1 and e.user_id = $2 limit 1`,
      [data.eventId, context.userId],
    );
    return rows[0] ? mapEvent(rows[0]) : null;
  });

export const setEventOpen = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ eventId: z.string().min(1), open: z.boolean() }).parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      select id from events where id = ${data.eventId} and user_id = ${context.userId} limit 1
    `;
    if (!rows[0]) throw new Error("没有这场活动");
    await sql`update events set open = ${data.open} where id = ${data.eventId}`;
  });
