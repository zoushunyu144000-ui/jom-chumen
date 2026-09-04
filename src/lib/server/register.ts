import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { isRealQr } from "@/lib/pay";
import { nextApplyNo, makeVerifyToken } from "@/lib/server/apply-no";
import { ensureAppSchema } from "@/lib/server/schema";
import { makeCode, makeId } from "@/lib/utils";

export const createLightRegistration = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) =>
    z.object({
      slug: z.string().min(1),
      nickname: z.string().trim().min(1).max(24),
      seats: z.number().int().min(1).max(4),
      paymentMethod: z.enum(["tng", "cash", "free"]),
      contactWechat: z.string().trim().max(40).default(""),
      contactWhatsapp: z.string().trim().min(8).max(24),
    }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      title: string;
      price: string | number;
      currency: string;
      open: boolean | null;
      status: string | null;
      user_id: string | null;
      tng_qr: string | null;
    }>`
      select id, title, price, currency, open, coalesce(status, 'published') as status, user_id,
        case when char_length(coalesce(tng_qr,'')) > 40 then 'yes' else coalesce(tng_qr,'') end as tng_qr
      from events where slug = ${data.slug} limit 1
    `;
    const event = rows[0];
    if (!event) throw new Error("活动不存在");
    if (event.status === "cancelled") throw new Error("这场局已取消");
    if (event.open === false) throw new Error("这场局已停止报名");
    const phone = data.contactWhatsapp.replace(/\D/g, "");
    if (phone.length < 8 || phone.length > 20) throw new Error("请填写有效 WhatsApp");
    const mine = await sql<{ id: string }>`
      select id from registrations
      where event_id = ${event.id} and user_id = ${context.userId}
        and payment_status in ('pending', 'approved', 'paid')
      limit 1`;
    if (mine[0]) throw new Error("你已经报过这场");
    const dup = await sql<{ id: string }>`
      select id from registrations
      where event_id = ${event.id}
        and regexp_replace(phone, '[^0-9]', '', 'g') = ${phone}
        and payment_status in ('pending', 'approved', 'paid')
      limit 1`;
    if (dup[0]) throw new Error("这个 WhatsApp 已经交过申请");
    const amount = Number(event.price) * data.seats;
    let method = amount <= 0 ? "free" : data.paymentMethod;
    if (amount > 0 && method === "tng" && !isRealQr(event.tng_qr) && event.tng_qr !== "yes") {
      throw new Error("主办还没有上传 TNG 收款码，请选现金");
    }
    if (amount > 0 && method === "free") throw new Error("请选择支付方式");
    const id = makeId("reg");
    const code = makeCode();
    const applyNo = await nextApplyNo(sql);
    const verifyToken = makeVerifyToken();
    await sql`
      insert into registrations (
        id, event_id, code, apply_no, nickname, phone, seats,
        payment_method, payment_status, amount, currency, user_id,
        contact_wechat, contact_whatsapp, verify_token
      ) values (
        ${id}, ${event.id}, ${code}, ${applyNo}, ${data.nickname}, ${phone}, ${data.seats},
        ${method}, ${"pending"}, ${amount}, ${event.currency}, ${context.userId},
        ${data.contactWechat}, ${phone}, ${verifyToken}
      )
    `;
    if (event.user_id) {
      const { pushMessage } = await import("@/lib/server/messages");
      await pushMessage({
        userId: event.user_id,
        title: "新的报名申请",
        body: `${data.nickname} 申请「${event.title}」，报名号 ${applyNo}`,
        href: `/manage/${event.id}`,
      });
    }
    return { code, applyNo };
  });
