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
  editedAt: string | null;
  replyToId: string;
  replyPreview: string;
  read: boolean;
};

export type ChatListItem = {
  id: string;
  title: string;
  last: string;
  createdAt: string;
  avatarUrl: string;
  unread: number;
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

async function requireMember(chatId: string, userId: string) {
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`
    select user_id from chat_members where chat_id = ${chatId} and user_id = ${userId} limit 1
  `;
  if (!rows[0]) throw new Error("你不在这个聊天里");
}

export function pairChatId(a: string, b: string) {
  const pair = [a, b].sort();
  return `chat_dm_${pair[0]}_${pair[1]}`;
}

async function moveChatMessages(fromId: string, toId: string) {
  if (!fromId || !toId || fromId === toId) return;
  const sql = await getSql();
  await sql`update chat_messages set chat_id = ${toId} where chat_id = ${fromId}`;
  await sql`delete from chat_members where chat_id = ${fromId}`;
  await sql`delete from chats where id = ${fromId}`;
}

async function coalescePairChats(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ chat_id: string; peer: string; n: number | string }>`
    select cm.chat_id, om.user_id as peer,
      (select count(*)::int from chat_members x where x.chat_id = cm.chat_id) as n
    from chat_members cm
    join chat_members om on om.chat_id = cm.chat_id and om.user_id <> cm.user_id
    where cm.user_id = ${userId}
  `;
  const byPeer = new Map<string, string[]>();
  for (const row of rows) {
    if (Number(row.n) !== 2) continue;
    const list = byPeer.get(row.peer) ?? [];
    if (!list.includes(row.chat_id)) list.push(row.chat_id);
    byPeer.set(row.peer, list);
  }
  for (const [peer, ids] of byPeer) {
    const canonical = pairChatId(userId, peer);
    const needsMove = ids.some((id) => id !== canonical);
    if (!needsMove && ids.includes(canonical)) continue;
    await ensureChat(canonical, "私信");
    await addMember(canonical, userId);
    await addMember(canonical, peer);
    for (const id of ids) {
      if (id !== canonical) await moveChatMessages(id, canonical);
    }
  }
}

export async function resolveChatId(rawId: string, userId: string) {
  await ensureAppSchema();
  const sql = await getSql();
  if (rawId.startsWith("chat_")) {
    const exists = await sql<{ id: string }>`select id from chats where id = ${rawId} limit 1`;
    if (!exists[0]) throw new Error("找不到这个聊天");
    await requireMember(rawId, userId);
    return rawId;
  }
  if (rawId.startsWith("club_")) {
    const club = await sql<{ id: string; name: string; user_id: string }>`select id, name, user_id from clubs where id = ${rawId} limit 1`;
    if (!club[0]) throw new Error("俱乐部不存在");
    if (club[0].user_id === userId) throw new Error("这是你自己的俱乐部");
    const id = pairChatId(userId, club[0].user_id);
    const legacy = `chat_${club[0].id}_${userId}`;
    await ensureChat(id, club[0].name || "私信");
    await addMember(id, userId);
    await addMember(id, club[0].user_id);
    if (legacy !== id) {
      const old = await sql<{ id: string }>`select id from chats where id = ${legacy} limit 1`;
      if (old[0]) await moveChatMessages(legacy, id);
    }
    await coalescePairChats(userId);
    return id;
  }
  const other = await sql<{ id: string; name: string | null }>`select id, name from "user" where id = ${rawId} limit 1`;
  if (!other[0]) throw new Error("找不到这个聊天");
  const id = pairChatId(userId, rawId);
  await ensureChat(id, other[0].name || "私信");
  await addMember(id, userId);
  await addMember(id, rawId);
  await coalescePairChats(userId);
  return id;
}

export const openClubChat = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ clubId: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const id = await resolveChatId(data.clubId, context.userId);
    return { id, title: "私信" };
  });

export const openDirectChat = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ userId: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) throw new Error("不能给自己发私信");
    const id = await resolveChatId(data.userId, context.userId);
    return { id };
  });

function shortAvatar(src?: string | null) {
  if (!src || src.startsWith("data:")) return "";
  return src;
}

export const listMyChats = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ChatListItem[]> => {
    await ensureAppSchema();
    await coalescePairChats(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      title: string;
      club_id: string | null;
      club_name: string | null;
      club_avatar: string | null;
      club_owner: string | null;
      created_at: string | Date;
      last: string | null;
      last_at: string | Date | null;
      unread: number | string | null;
      peer_name: string | null;
      peer_avatar: string | null;
      peer_id: string | null;
    }>`
      select c.id, c.title, c.club_id, c.created_at,
        cl.name as club_name, cl.avatar_url as club_avatar, cl.user_id as club_owner,
        (select case when kind = 'text' then body else coalesce(file_name, '附件') end
           from chat_messages m where m.chat_id = c.id order by created_at desc limit 1) as last,
        (select created_at from chat_messages m where m.chat_id = c.id order by created_at desc limit 1) as last_at,
        (select count(*)::int from chat_messages m
           where m.chat_id = c.id and m.user_id <> ${context.userId}
             and (cm.last_read_at is null or m.created_at > cm.last_read_at)) as unread,
        (select om.user_id
           from chat_members om
           where om.chat_id = c.id and om.user_id <> ${context.userId}
           limit 1) as peer_id,
        (select coalesce(p.display_name, u.name, '私信')
           from chat_members om
           left join profiles p on p.user_id = om.user_id
           left join "user" u on u.id = om.user_id
           where om.chat_id = c.id and om.user_id <> ${context.userId}
           limit 1) as peer_name,
        (select coalesce(p.avatar_url, u.image, '')
           from chat_members om
           left join profiles p on p.user_id = om.user_id
           left join "user" u on u.id = om.user_id
           where om.chat_id = c.id and om.user_id <> ${context.userId}
           limit 1) as peer_avatar
      from chats c
      join chat_members cm on cm.chat_id = c.id
      left join clubs cl on cl.id = c.club_id
      where cm.user_id = ${context.userId}
      order by coalesce(
        (select max(created_at) from chat_messages m where m.chat_id = c.id),
        c.created_at
      ) desc
      limit 50
    `;
    const staffOf = new Set<string>();
    const clubIds = [...new Set(rows.map((row) => row.club_id).filter(Boolean))] as string[];
    if (clubIds.length) {
      const staff = await sql<{ club_id: string }>`
        select club_id from club_members where user_id = ${context.userId}
      `;
      for (const row of staff) staffOf.add(row.club_id);
    }
    const mapped = rows.map((row) => {
      const isStaff = Boolean(row.club_id && (row.club_owner === context.userId || staffOf.has(row.club_id)));
      const title = row.club_id
        ? (isStaff ? (row.peer_name || row.club_name || row.title) : (row.club_name || row.peer_name || row.title))
        : (row.peer_name || row.title || "私信");
      const avatar = row.club_id && !isStaff
        ? shortAvatar(row.club_avatar)
        : shortAvatar(row.peer_avatar);
      const rawLast = row.last || "";
      const last = rawLast.startsWith("data:") || /^https?:/.test(rawLast) || rawLast.startsWith("/api/")
        ? "[图片]"
        : rawLast;
      return {
        id: row.id,
        title,
        last,
        createdAt: new Date(row.last_at || row.created_at).toISOString(),
        avatarUrl: avatar,
        unread: Number(row.unread) || 0,
        peerId: row.peer_id || "",
      };
    });
    const seen = new Set<string>();
    const out: ChatListItem[] = [];
    for (const row of mapped) {
      const key = row.peerId || row.id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: row.id,
        title: row.title,
        last: row.last,
        createdAt: row.createdAt,
        avatarUrl: row.avatarUrl,
        unread: row.unread,
      });
    }
    return out;
  });

export const listChatMessages = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ chatId: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ id: string; title: string; peerLastReadAt: string | null; messages: ChatMessage[] }> => {
    const chatId = await resolveChatId(data.chatId, context.userId);
    const sql = await getSql();
    await sql`update chat_members set last_read_at = now() where chat_id = ${chatId} and user_id = ${context.userId}`;
    const chat = await sql<{ title: string; club_id: string | null }>`select title, club_id from chats where id = ${chatId} limit 1`;
    const peer = await sql<{ name: string | null; last_read_at: string | Date | null }>`
      select coalesce(p.display_name, u.name, c.title) as name, om.last_read_at
      from chat_members om
      join chats c on c.id = om.chat_id
      left join profiles p on p.user_id = om.user_id
      left join "user" u on u.id = om.user_id
      where om.chat_id = ${chatId} and om.user_id <> ${context.userId}
      limit 1
    `;
    const peerLastReadAt = peer[0]?.last_read_at ? new Date(peer[0].last_read_at).toISOString() : null;
    const rows = await sql<{
      id: string;
      user_id: string;
      kind: string;
      body: string;
      file_name: string;
      created_at: string | Date;
      edited_at: string | Date | null;
      reply_to_id: string | null;
      reply_body: string | null;
      reply_kind: string | null;
    }>`
      select m.id, m.user_id, m.kind, m.body, m.file_name, m.created_at, m.edited_at, m.reply_to_id,
        r.body as reply_body, r.kind as reply_kind
      from chat_messages m
      left join chat_messages r on r.id = m.reply_to_id
      where m.chat_id = ${chatId}
      order by m.created_at asc
      limit 200
    `;
    const peerReadMs = peerLastReadAt ? Date.parse(peerLastReadAt) : 0;
    return {
      id: chatId,
      title: peer[0]?.name || chat[0]?.title || "私信",
      peerLastReadAt,
      messages: rows.map((row) => {
        const createdAt = new Date(row.created_at).toISOString();
        const mine = row.user_id === context.userId;
        const replyKind = row.reply_kind || "";
        const replyBody = row.reply_body || "";
        const replyPreview = replyKind === "image" || replyKind === "file" ? "[图片]" : replyBody.slice(0, 80);
        return {
          id: row.id,
          userId: row.user_id,
          kind: (row.kind as ChatMessage["kind"]) || "text",
          body: row.body,
          fileName: row.file_name || "",
          mine,
          createdAt,
          editedAt: row.edited_at ? new Date(row.edited_at).toISOString() : null,
          replyToId: row.reply_to_id || "",
          replyPreview,
          read: mine && peerReadMs >= Date.parse(createdAt),
        };
      }),
    };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      chatId: z.string().min(1),
      kind: z.enum(["text", "image", "file"]).default("text"),
      body: z.string().min(1).max(240_000),
      fileName: z.string().max(80).default(""),
      replyToId: z.string().max(80).optional(),
    }).parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const chatId = await resolveChatId(data.chatId, context.userId);
    if (data.kind !== "text" && data.body.startsWith("data:") && data.body.length > 220_000) {
      throw new Error("图片太大，请发更小的图");
    }
    const sql = await getSql();
    const recent = await sql<{ user_id: string }>`
      select user_id from chat_messages where chat_id = ${chatId} order by created_at desc limit 2
    `;
    if (recent.length === 2 && recent.every((row) => row.user_id === context.userId)) {
      throw new Error("等对方回一句再发，一次最多连续两条");
    }
    const id = makeId("cm");
    const replyToId = data.replyToId || null;
    await sql`insert into chat_messages (id, chat_id, user_id, kind, body, file_name, reply_to_id) values (${id}, ${chatId}, ${context.userId}, ${data.kind}, ${data.body}, ${data.fileName}, ${replyToId})`;
    await sql`update chat_members set last_read_at = now() where chat_id = ${chatId} and user_id = ${context.userId}`;
    return { id, chatId };
  });

export const editChatMessage = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      chatId: z.string().min(1),
      messageId: z.string().min(1),
      body: z.string().min(1).max(8_000),
    }).parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const chatId = await resolveChatId(data.chatId, context.userId);
    const sql = await getSql();
    const row = await sql<{ id: string; user_id: string; kind: string; created_at: string | Date }>`
      select id, user_id, kind, created_at from chat_messages
      where id = ${data.messageId} and chat_id = ${chatId} limit 1
    `;
    if (!row[0] || row[0].user_id !== context.userId) throw new Error("只能改自己发的消息");
    if (row[0].kind !== "text") throw new Error("图片不能改字");
    if (Date.now() - new Date(row[0].created_at).getTime() > 15 * 60_000) {
      throw new Error("超过 15 分钟不能再改");
    }
    await sql`update chat_messages set body = ${data.body}, edited_at = now() where id = ${data.messageId} and chat_id = ${chatId}`;
    return { id: data.messageId };
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
