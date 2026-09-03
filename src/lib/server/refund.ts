import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureAppSchema } from "@/lib/server/schema";
import { pushMessage } from "@/lib/server/messages";

export const saveEventRefund = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      slug: z.string().min(1),
      refundHours: z.number().int().min(0).max(168),
      refundFeePercent: z.number().int().min(0).max(100),
    }).parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    const sql = await getSql();
    await sql`
      update events
      set refund_hours = ${data.refundHours}, refund_fee_percent = ${data.refundFeePercent}
      where slug = ${data.slug} and user_id = ${context.userId}
    `;
  });

export const requestRefund = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ code: z.string().min(3) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      payment_status: string;
      nickname: string;
      event_id: string;
      user_id: string | null;
    }>`
      select id, payment_status, nickname, event_id, user_id
      from registrations
      where (code = ${data.code} or apply_no = ${data.code})
        and (user_id = ${context.userId} or user_id is null)
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("找不到这条报名");
    if (row.payment_status === "pending") {
      await sql`update registrations set payment_status = 'cancelled' where id = ${row.id}`;
      return { kind: "cancelled" as const };
    }
    if (row.payment_status !== "approved" && row.payment_status !== "paid") {
      throw new Error("这条申请不能申请退款");
    }
    await sql`update registrations set refund_status = 'requested' where id = ${row.id}`;
    const ev = await sql<{ user_id: string | null; title: string; refund_hours: number | null; refund_fee_percent: number | null; starts_at: string | Date }>`
      select user_id, title, refund_hours, refund_fee_percent, starts_at from events where id = ${row.event_id} limit 1
    `;
    const hours = Number(ev[0]?.refund_hours) || 24;
    const fee = Number(ev[0]?.refund_fee_percent) || 50;
    const start = ev[0] ? new Date(ev[0].starts_at).getTime() : 0;
    const late = start - Date.now() < hours * 3600 * 1000;
    if (ev[0]?.user_id) {
      await pushMessage({
        userId: ev[0].user_id,
        title: late ? "退款申请（已过全额时限）" : "退款申请",
        body: `${row.nickname} 申请退「${ev[0].title}」。${late ? `已不满 ${hours} 小时，可按规则扣 ${fee}%。` : `仍在开场前 ${hours} 小时内。`}`,
        href: `/manage/${row.event_id}`,
      });
    }
    return { kind: "requested" as const, late, hours, fee };
  });
