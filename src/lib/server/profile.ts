import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { ProfileRecord } from "@/lib/types";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ProfileRecord> => {
    const sql = await getSql();
    const rows = await sql<{
      display_name: string;
      avatar_url: string;
      tags: string;
    }>`select display_name, avatar_url, tags from profiles where user_id = ${context.userId} limit 1`;
    const row = rows[0];
    if (!row) return { displayName: "", avatarUrl: "", tags: [] };
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(row.tags || "[]") as unknown;
      if (Array.isArray(parsed)) tags = parsed.map(String).slice(0, 8);
    } catch {
      tags = [];
    }
    return {
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      tags,
    };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        displayName: z.string().trim().min(1).max(24),
        avatarUrl: z.string().max(1_500_000).default(""),
        tags: z.array(z.string().trim().min(1).max(12)).max(8).default([]),
      })
      .parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into profiles (user_id, display_name, avatar_url, tags, updated_at)
      values (
        ${context.userId},
        ${data.displayName},
        ${data.avatarUrl},
        ${JSON.stringify(data.tags)},
        now()
      )
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        tags = excluded.tags,
        updated_at = now()
    `;
  });

export const getHostSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      whatsapp: string;
      wechat_qr: string;
      alipay_qr: string;
      tng_qr: string;
    }>`select * from host_settings where user_id = ${context.userId} limit 1`;
    return (
      rows[0] ?? {
        whatsapp: "",
        wechat_qr: "",
        alipay_qr: "",
        tng_qr: "",
      }
    );
  });

export const saveHostSettings = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        whatsapp: z.string().trim().max(20).default(""),
        wechatQr: z.string().max(1_500_000).default(""),
        alipayQr: z.string().max(1_500_000).default(""),
        tngQr: z.string().max(1_500_000).default(""),
      })
      .parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into host_settings (user_id, whatsapp, wechat_qr, alipay_qr, tng_qr)
      values (
        ${context.userId},
        ${data.whatsapp},
        ${data.wechatQr},
        ${data.alipayQr},
        ${data.tngQr}
      )
      on conflict (user_id) do update set
        whatsapp = excluded.whatsapp,
        wechat_qr = excluded.wechat_qr,
        alipay_qr = excluded.alipay_qr,
        tng_qr = excluded.tng_qr
    `;
  });
