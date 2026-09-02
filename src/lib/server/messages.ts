import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { makeId } from "@/lib/utils";
import type { MessageRecord } from "@/lib/types";

export async function pushMessage(input: {
  userId: string;
  title: string;
  body: string;
  href?: string;
}) {
  const sql = await getSql();
  await sql`
    insert into messages (id, user_id, title, body, href)
    values (
      ${makeId("msg")},
      ${input.userId},
      ${input.title},
      ${input.body},
      ${input.href ?? ""}
    )
  `;
}

export const listMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MessageRecord[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      title: string;
      body: string;
      href: string;
      read: boolean;
      created_at: string | Date;
    }>`
      select * from messages
      where user_id = ${context.userId}
      order by created_at desc
      limit 80
    `;
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      href: row.href,
      read: Boolean(row.read),
      createdAt: new Date(row.created_at).toISOString(),
    }));
  });

export const unreadCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ n: number }>`
      select count(*)::int as n from messages
      where user_id = ${context.userId} and read = false
    `;
    return rows[0]?.n ?? 0;
  });

export const markRead = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update messages set read = true
      where id = ${data.id} and user_id = ${context.userId}
    `;
  });
