import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureVerifyToken, verifyTicketUrl } from "@/lib/server/apply-no";
import { ensureAppSchema } from "@/lib/server/schema";
import type { EventRecord, TicketRecord } from "@/lib/types";

export const listMyTickets = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TicketRecord[]> => {
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql<{
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
      cancel_reason: string | null;
      verify_token: string | null;
      slug: string;
      title: string;
      category: string;
      city: string;
      venue: string;
      starts_at: string | Date;
      ends_at: string | Date;
    }>`
      select r.id, r.code, r.apply_no, r.nickname, r.phone, r.seats, r.payment_method,
             r.payment_status, r.amount, r.currency, r.created_at,
             coalesce(r.cancel_reason,'') as cancel_reason, r.verify_token,
             e.slug, e.title, e.category, e.city, e.venue, e.starts_at, e.ends_at
      from registrations r
      join events e on e.id = r.event_id
      where r.user_id = ${context.userId}
        and r.payment_status in ('approved', 'paid')
        and coalesce(e.status, 'published') <> 'cancelled'
      order by r.created_at desc
      limit 40
    `;
    const out: TicketRecord[] = [];
    for (const row of rows) {
      const token = await ensureVerifyToken(sql, row.id, row.verify_token);
      const event = {
        id: row.slug,
        slug: row.slug,
        title: row.title,
        subtitle: "",
        category: row.category,
        city: row.city,
        venue: row.venue,
        address: row.venue,
        lat: null,
        lng: null,
        startsAt: new Date(row.starts_at).toISOString(),
        endsAt: new Date(row.ends_at).toISOString(),
        currency: row.currency,
        price: Number(row.amount) || 0,
        capacity: 0,
        sold: 0,
        booked: 0,
        remaining: 0,
        coverUrl: `/api/media/${row.slug}?kind=cover`,
        description: "",
        highlights: [],
        hostName: "",
        hostNote: "",
        level: "all",
        body: [],
        clubId: null,
        clubName: null,
        userId: null,
        open: true,
        status: "published",
        cancelReason: "",
        whatsapp: "",
        wechatQr: "",
        alipayQr: "",
        tngQr: "",
      } as EventRecord;
      out.push({
        id: row.code,
        code: row.code,
        applyNo: row.apply_no || row.code,
        nickname: row.nickname,
        phoneMasked: "",
        seats: Number(row.seats),
        paymentMethod: row.payment_method as TicketRecord["paymentMethod"],
        paymentStatus: row.payment_status as TicketRecord["paymentStatus"],
        amount: Number(row.amount) || 0,
        currency: row.currency as TicketRecord["currency"],
        createdAt: new Date(row.created_at).toISOString(),
        rejectReason: "",
        cancelReason: row.cancel_reason || "",
        contactWechat: "",
        contactWhatsapp: "",
        verifyUrl: verifyTicketUrl(token),
        event,
      });
    }
    return out;
  });
