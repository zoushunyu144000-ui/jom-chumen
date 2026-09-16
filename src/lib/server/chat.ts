import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureAppSchema } from "@/lib/server/schema";
import { makeId } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  userId: string;
  kind: "text" | "image" | "file";
  body: string;
  fileName: string;
  mine: boolean;
  createdAt: string;
};

export type ChatListItem = {
  id: string;
  title: string;
  last: string;
  createdAt: string;
};

async function addMember(chatId: string, userId: string) {
  if (!userId) return;
  const sql = await getSql();
  try {
    await sql`insert into chat_members (chat_id, user_id) values (${chatId}, ${userId}) on conflict do nothing`;
  } catch { /* ignore */ }
}

async function ensureChat(id: string, title: string, clubId?: string) {
  const sql = await getSql();
  try {
    await sql`insert into chats (id, title) values (${id}, ${title}) on conflict (id) do nothing`;
  } catch { /* ignore */ }
  if (clubId) {
    try {
      await sql`update chats set club_id = ${clubId} where id = ${id} and (club_id is null or club_id = '')`;
    } catch { /* ignore */ }
  }
}

export async function resolveChatId(rawId: string, userId: string) {
  await ensureAppSchema();
  const sql = await getSql();
  if (rawId.startsWith("chat_")) {
    await ensureChat(rawId, "私信");
    await addMember(rawId, userId);
    return rawId;
  }
  if (rawId.startsWith("club_")) {
    const club = await sql<{ id: string; name: string; user_id: string }>`select id, name, user_id from clubs where id = ${rawId} limit 1`;
    if (!club[0]) throw new Error("俱乐部不存在");
    const id = `chat_${club[0].id}_${userId}`;
    await ensureChat(id, club[0].name || "私信", club[0].id);
    await addMember(id, userId);
    await addMember(id, club[0].user_id);
    try {
      const admins = await sql<{ user_id: string }>`select user_id from club_members where club_id = ${club[0].id}`;
      for (const admin of admins) await addMember(id, admin.user_id);
    } catch { /* ignore */ }
    return id;
  }
  const other = await sql<{ id: string; name: string | null }>`select id, name from "user" where id = ${rawId} limit 1`;
  if (!other[0]) throw new Error("找不到这个聊天");
  const pair = [userId, rawId].sort();
  const id = `chat_dm_${pair[0]}_${pair[1]}`;
  await ensureChat(id, other[0].name || "私信");
  await addMember(id, userId);
  await addMember(id, rawId);
  return id;
}

export const openClubChat = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ clubId: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const id = await resolveChatId(data.clubId, context.userId);
    return { id, title: "私信" };
  });

export const listMyChats = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ChatListItem[]> => {
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql<{ id: string; title: string; created_at: string | Date; last: string | null }>`
      select c.id, c.title, c.created_at,
        (select case when kind = 'text' then body else coalesce(file_name, '附件') end
           from chat_messages m where m.chat_id = c.id order by created_at desc limit 1) as last
      from chats c
      join chat_members cm on cm.chat_id = c.id
      where cm.user_id = ${context.userId}
      order by c.created_at desc
      limit 50
    `;
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      last: (row.last || "").startsWith("data:") ? "[图片]" : (row.last || ""),
      createdAt: new Date(row.created_at).toISOString(),
    }));
  });

export const listChatMessages = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ chatId: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ id: string; title: string; messages: ChatMessage[] }> => {
    const chatId = await resolveChatId(data.chatId, context.userId);
    const sql = await getSql();
    const chat = await sql<{ title: string }>`select title from chats where id = ${chatId} limit 1`;
    const rows = await sql<{ id: string; user_id: string; kind: string; body: string; file_name: string; created_at: string | Date }>`
      select id, user_id, kind, body, file_name, created_at from chat_messages where chat_id = ${chatId} order by created_at asc limit 200
    `;
    return {
      id: chatId,
      title: chat[0]?.title || "私信",
      messages: rows.map((row) => ({
        id: row.id, userId: row.user_id, kind: (row.kind as ChatMessage["kind"]) || "text",
        body: row.body, fileName: row.file_name || "", mine: row.user_id === context.userId,
        createdAt: new Date(row.created_at).toISOString(),
      })),
    };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      chatId: z.string().min(1),
      kind: z.enum(["text", "image", "file"]).default("text"),
      body: z.string().min(1).max(900_000),
      fileName: z.string().max(80).default(""),
    }).parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const chatId = await resolveChatId(data.chatId, context.userId);
    const sql = await getSql();
    const recent = await sql<{ user_id: string }>`
      select user_id from chat_messages where chat_id = ${chatId} order by created_at desc limit 2
    `;
    if (recent.length === 2 && recent.every((row) => row.user_id === context.userId)) {
      throw new Error("等对方回一句再发，一次最多连续两条");
    }
    const id = makeId("cm");
    await sql`insert into chat_messages (id, chat_id, user_id, kind, body, file_name) values (${id}, ${chatId}, ${context.userId}, ${data.kind}, ${data.body}, ${data.fileName})`;
    return { id, chatId };
  });

export const clubInviteInfo = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ clubId: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    const sql = await getSql();
    const club = await sql<{ id: string; name: string; user_id: string; invite_code: string | null }>`
      select id, name, user_id, invite_code from clubs where id = ${data.clubId} limit 1
    `;
    if (!club[0]) throw new Error("没有这个俱乐部");
    const allowed =
      club[0].user_id === context.userId ||
      Boolean((await sql<{ user_id: string }>`select user_id from club_members where club_id = ${data.clubId} and user_id = ${context.userId} limit 1`)[0]);
    if (!allowed) throw new Error("只有管理员能邀请");
    await sql`insert into club_members (club_id, user_id, role) values (${club[0].id}, ${club[0].user_id}, ${"owner"}) on conflict do nothing`;
    let code = club[0].invite_code;
    if (!code) {
      code = makeId("inv").replace("inv_", "");
      await sql`update clubs set invite_code = ${code} where id = ${club[0].id}`;
    }
    const members = await sql<{ user_id: string }>`select user_id from club_members where club_id = ${data.clubId}`;
    return { code, name: club[0].name, members: members.length };
  });

export const joinClubByCode = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ code: z.string().min(4) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    const sql = await getSql();
    const club = await sql<{ id: string; name: string }>`select id, name from clubs where invite_code = ${data.code.trim()} limit 1`;
    if (!club[0]) throw new Error("邀请码无效");
    await sql`insert into club_members (club_id, user_id, role) values (${club[0].id}, ${context.userId}, ${"admin"}) on conflict do nothing`;
    return { clubId: club[0].id, name: club[0].name };
  });
