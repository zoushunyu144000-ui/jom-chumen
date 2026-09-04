import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { loadEventMetaById } from "@/lib/server/event-meta";
import { ensureAppSchema } from "@/lib/server/schema";
import { authMiddleware } from "@/lib/auth/middleware";

export const getLightTicket = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: unknown) => z.object({ code: z.string().min(3) }).parse(data))
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql<{
      id: string; code: string; apply_no: string | null; nickname: string; seats: number;
      payment_method: string; payment_status: string; amount: string | number; currency: string;
      event_id: string; refund_status: string | null; reject_reason: string | null;
      cancel_reason: string | null;
    }>`
      select id, code, apply_no, nickname, seats, payment_method, payment_status, amount, currency,
             event_id, coalesce(refund_status,'') as refund_status, reject_reason,
             coalesce(cancel_reason,'') as cancel_reason
      from registrations
      where user_id = ${context.userId} and (code = ${data.code} or apply_no = ${data.code})
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    const event = await loadEventMetaById(row.event_id);
    if (!event) return null;
    return {
      code: row.code,
      applyNo: row.apply_no || row.code,
      nickname: row.nickname,
      seats: Number(row.seats),
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      amount: Number(row.amount) || 0,
      currency: row.currency,
      refundStatus: row.refund_status || "",
      rejectReason: row.reject_reason || "",
      cancelReason: row.cancel_reason || "",
      event,
    };
  });

export const requestRefund = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ code: z.string().min(3) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql<{ id: string; payment_status: string; event_id: string }>`
      select id, payment_status, event_id from registrations
      where (code = ${data.code} or apply_no = ${data.code}) and user_id = ${context.userId}
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("找不到这条报名");
    if (row.payment_status !== "approved" && row.payment_status !== "paid") {
      throw new Error("只有报名成功后才能申请退款");
    }
    await sql`update registrations set refund_status = 'requested' where id = ${row.id}`;
    const ev = await sql<{ user_id: string | null; title: string }>`select user_id, title from events where id = ${row.event_id} limit 1`;
    if (ev[0]?.user_id) {
      const { pushMessage } = await import("@/lib/server/messages");
      await pushMessage({
        userId: ev[0].user_id,
        title: "退款申请",
        body: `有人申请退「${ev[0].title}」的款，报名号 ${data.code}`,
        href: `/manage/${row.event_id}`,
      });
    }
  });
