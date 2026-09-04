import { randomBytes } from "node:crypto";
import type { Sql } from "@/lib/db";
import { ensureAppSchema } from "@/lib/server/schema";
import { publicSiteUrl } from "@/lib/public-url";
import { makeApplyNo } from "@/lib/utils";

export async function nextApplyNo(sql: Sql) {
  await ensureAppSchema();
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date());
  const rows = await sql<{ n: number }>`
    insert into apply_counters (day, n) values (${day}, 1)
    on conflict (day) do update set n = apply_counters.n + 1
    returning n
  `;
  return makeApplyNo(rows[0]?.n ?? 1, new Date(`${day}T12:00:00+08:00`));
}

export function makeVerifyToken() {
  return randomBytes(24).toString("base64url");
}

export function verifyTicketUrl(token: string) {
  return `${publicSiteUrl()}/verify/${token}`;
}

export async function ensureVerifyToken(sql: Sql, registrationId: string, existing?: string | null) {
  if (existing) return existing;
  for (let i = 0; i < 4; i += 1) {
    const token = makeVerifyToken();
    try {
      const rows = await sql<{ verify_token: string }>`
        update registrations
        set verify_token = ${token}
        where id = ${registrationId} and (verify_token is null or verify_token = '')
        returning verify_token
      `;
      if (rows[0]?.verify_token) return rows[0].verify_token;
      const current = await sql<{ verify_token: string | null }>`
        select verify_token from registrations where id = ${registrationId} limit 1
      `;
      if (current[0]?.verify_token) return current[0].verify_token;
    } catch {
      /* unique collision — retry */
    }
  }
  throw new Error("无法生成验票码");
}
