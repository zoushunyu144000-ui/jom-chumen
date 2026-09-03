import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureAppSchema } from "@/lib/server/schema";

export const saveEventPolicy = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      slug: z.string().min(1),
      refundHours: z.number().int().min(0).max(168),
      refundFeePercent: z.number().int().min(0).max(100),
      galleryCount: z.number().int().min(0).max(12),
    }).parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    const sql = await getSql();
    await sql`
      update events
      set refund_hours = ${data.refundHours},
          refund_fee_percent = ${data.refundFeePercent},
          gallery_count = ${data.galleryCount}
      where slug = ${data.slug} and user_id = ${context.userId}
    `;
  });
