import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireUserId, UnauthorizedError } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
import { canManageEvent } from "@/lib/server/access";
import { ensureAppSchema } from "@/lib/server/schema";

export type VerifyResult = {
  valid: boolean;
  state: "valid" | "cancelled" | "refunded" | "used" | "pending" | "unknown" | "event_cancelled";
  eventTitle: string;
  nickname: string;
  seats: number;
  applyNo: string;
  canCheckIn: boolean;
};

function stateOf(row: {
  payment_status: string;
  refund_status: string | null;
  checked_in_at: string | Date | null;
  event_status: string | null;
  event_open: boolean | null;
}): VerifyResult["state"] {
  if (row.event_status === "cancelled") return "event_cancelled";
  if (row.payment_status === "cancelled" || row.payment_status === "rejected") return "cancelled";
  if ((row.refund_status || "") === "refunded") return "refunded";
  if (row.checked_in_at) return "used";
  if (row.payment_status === "approved" || row.payment_status === "paid") return "valid";
  if (row.payment_status === "pending") return "pending";
  return "unknown";
}

async function optionalUserId() {
  try {
    return await requireUserId();
  } catch (err) {
    if (err instanceof UnauthorizedError) return null;
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Auth is disabled")) return null;
    throw err;
  }
}

export const getVerifyTicket = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ token: z.string().trim().min(12).max(80) }).parse(data))
  .handler(async ({ data }): Promise<VerifyResult> => {
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql<{
      event_id: string;
      nickname: string;
      seats: number;
      apply_no: string | null;
      code: string;
      payment_status: string;
      refund_status: string | null;
      checked_in_at: string | Date | null;
      event_title: string;
      event_status: string | null;
      event_open: boolean | null;
    }>`
      select r.event_id, r.nickname, r.seats, r.apply_no, r.code, r.payment_status,
             coalesce(r.refund_status, '') as refund_status, r.checked_in_at,
             e.title as event_title, coalesce(e.status, 'published') as event_status, e.open as event_open
      from registrations r
      join events e on e.id = r.event_id
      where r.verify_token = ${data.token}
      limit 1
    `;
    const row = rows[0];
    if (!row) {
      return { valid: false, state: "unknown", eventTitle: "", nickname: "", seats: 0, applyNo: "", canCheckIn: false };
    }
    const state = stateOf(row);
    const userId = state === "valid" ? await optionalUserId() : null;
    const canCheckIn = Boolean(userId && (await canManageEvent(userId, row.event_id)));
    return {
      valid: state === "valid",
      state,
      eventTitle: row.event_title,
      nickname: row.nickname,
      seats: Number(row.seats),
      applyNo: row.apply_no || row.code,
      canCheckIn,
    };
  });

export const checkInTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => z.object({ token: z.string().trim().min(12).max(80) }).parse(data))
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      event_id: string;
      payment_status: string;
      refund_status: string | null;
      checked_in_at: string | Date | null;
      event_status: string | null;
    }>`
      select r.id, r.event_id, r.payment_status, coalesce(r.refund_status, '') as refund_status,
             r.checked_in_at, coalesce(e.status, 'published') as event_status
      from registrations r
      join events e on e.id = r.event_id
      where r.verify_token = ${data.token}
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("找不到这张票");
    if (!(await canManageEvent(context.userId, row.event_id))) throw new Error("只有主办人可以核销");
    const state = stateOf({
      payment_status: row.payment_status,
      refund_status: row.refund_status,
      checked_in_at: row.checked_in_at,
      event_status: row.event_status,
      event_open: true,
    });
    if (state === "event_cancelled" || state === "cancelled") throw new Error("这张票已无效");
    if (state === "refunded") throw new Error("已退款，不能入场");
    if (state === "used") throw new Error("已经核销过了");
    if (state !== "valid") throw new Error("还不是有效票");
    await sql`update registrations set checked_in_at = now() where id = ${row.id}`;
  });
