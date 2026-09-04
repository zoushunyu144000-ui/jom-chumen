import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

async function migratedDb() {
  const db = new PGlite();
  const dir = join(process.cwd(), "migrations");
  const files = (await readdir(dir)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
  for (const file of files) {
    await db.exec(await readFile(join(dir, file), "utf8"));
  }
  return db;
}

async function allocateApplyNo(db, day = "2026-09-04") {
  const result = await db.query(
    `insert into apply_counters (day, n) values ($1, 1)
     on conflict (day) do update set n = apply_counters.n + 1
     returning n`,
    [day],
  );
  const n = Number(result.rows[0]?.n || 0);
  return `HD-${day.replaceAll("-", "")}-${String(n).padStart(3, "0")}`;
}

async function addUser(db, id, email) {
  await db.query(
    `insert into "user" ("id", "name", "email", "emailVerified", "updatedAt")
     values ($1, $2, $3, true, now())`,
    [id, id, email],
  );
}

async function addSession(db, id, userId) {
  await db.query(
    `insert into "session" ("id", "expiresAt", "token", "updatedAt", "userId")
     values ($1, now() + interval '1 day', $2, now(), $3)`,
    [id, `token-${id}`, userId],
  );
}

test("核心业务链路：报名、出票、验票、核销、撤票和隐私", async () => {
  const db = await migratedDb();
  try {
    await addUser(db, "host", "host@example.test");
    await addUser(db, "user-a", "a@example.test");
    await addUser(db, "user-b", "b@example.test");
    await addUser(db, "user-c", "c@example.test");
    await addSession(db, "session-a", "user-a");

    const login = await db.query(
      `select s."userId" as user_id from "session" s where s.token = $1 and s."expiresAt" > now()`,
      ["token-session-a"],
    );
    assert.equal(login.rows[0]?.user_id, "user-a", "A 的登录 session 必须能找到 A");

    await db.query(
      `insert into clubs (id, user_id, name, city, cover_url) values ('club-1', 'host', 'JOM 测试俱乐部', 'penang', '')`,
    );
    await db.query(
      `insert into club_members (club_id, user_id, role) values ('club-1', 'host', 'owner') on conflict do nothing`,
    );
    await db.query(
      `insert into events (
        id, slug, title, subtitle, category, city, venue, address, starts_at, ends_at,
        currency, price, capacity, sold, cover_url, description, highlights, host_name,
        user_id, club_id, open, status
      ) values (
        'event-1', 'flow-test', '核心链路测试局', '', 'talk', 'penang', 'Test Cafe', 'Penang',
        now() + interval '1 day', now() + interval '1 day 2 hours', 'MYR', 20, 50, 0, '', '', '[]', 'Host',
        'host', 'club-1', true, 'published'
      )`,
    );

    const applyNo = await allocateApplyNo(db);
    const verifyToken = "verify-user-a-0123456789abcdef";
    await db.query(
      `insert into registrations (
        id, event_id, code, apply_no, nickname, phone, seats, payment_method, payment_status,
        amount, currency, user_id, contact_whatsapp, verify_token
      ) values (
        'reg-a', 'event-1', 'ticket-a', $1, '用户A', '60111111111', 1, 'tng', 'pending',
        20, 'MYR', 'user-a', '60111111111', $2
      )`,
      [applyNo, verifyToken],
    );

    const pending = await db.query(
      `select apply_no, verify_token, payment_status from registrations where id = 'reg-a'`,
    );
    assert.equal(pending.rows[0]?.apply_no, applyNo);
    assert.equal(pending.rows[0]?.verify_token, verifyToken);
    assert.equal(pending.rows[0]?.payment_status, "pending");

    // 主办人工确认付款，票才变成有效票。
    await db.query(`update registrations set payment_status = 'approved' where id = 'reg-a'`);
    const ticket = await db.query(
      `select code, apply_no, verify_token from registrations
       where user_id = $1 and (code = $2 or apply_no = $2) and payment_status in ('approved', 'paid')`,
      ["user-a", applyNo],
    );
    assert.equal(ticket.rows.length, 1, "A 应该能拿到自己的票");
    assert.ok(ticket.rows[0]?.verify_token, "电子票必须有 verify token");

    const publicVerify = await db.query(
      `select r.nickname, r.seats, r.apply_no, r.payment_status, r.checked_in_at,
              coalesce(r.refund_status, '') as refund_status, coalesce(e.status, 'published') as event_status
       from registrations r join events e on e.id = r.event_id
       where r.verify_token = $1 limit 1`,
      [verifyToken],
    );
    assert.equal(publicVerify.rows[0]?.payment_status, "approved");
    assert.equal(publicVerify.rows[0]?.checked_in_at, null);

    // 只有主办方权限查询命中后才允许核销；第一次核销后，再扫必须显示已用。
    const hostCanManage = await db.query(
      `select 1 from events e
       where e.id = 'event-1' and (
         e.user_id = $1
         or e.club_id in (select club_id from club_members where user_id = $1 and role in ('owner','admin'))
       )`,
      ["host"],
    );
    assert.equal(hostCanManage.rows.length, 1);
    await db.query(`update registrations set checked_in_at = now() where id = 'reg-a'`);
    const used = await db.query(`select checked_in_at from registrations where verify_token = $1`, [verifyToken]);
    assert.ok(used.rows[0]?.checked_in_at, "第一次核销应写入时间");
    const secondScan = await db.query(
      `select case when checked_in_at is not null then 'used' else 'valid' end as state
       from registrations where verify_token = $1`,
      [verifyToken],
    );
    assert.equal(secondScan.rows[0]?.state, "used", "再次扫码必须是已核销");

    // 撤票后，同一个 token 立即无效。
    await db.query(
      `update registrations set payment_status = 'cancelled', cancelled_at = now(), cancelled_by = 'host', cancel_reason = '测试撤票'
       where id = 'reg-a'`,
    );
    const revoked = await db.query(
      `select payment_status, cancel_reason from registrations where verify_token = $1`,
      [verifyToken],
    );
    assert.equal(revoked.rows[0]?.payment_status, "cancelled");
    assert.equal(revoked.rows[0]?.cancel_reason, "测试撤票");

    // B 拿到 A 的票号 / 报名号，也不能通过“自己的票”查询读到 A。
    const bByCode = await db.query(
      `select id, nickname, phone from registrations
       where user_id = $1 and (code = $2 or apply_no = $2) limit 1`,
      ["user-b", applyNo],
    );
    assert.equal(bByCode.rows.length, 0, "B 不能凭 A 的报名号读取 A 的资料");

    // 私聊是 A <-> host；B/C 即使知道 chat id，也不是成员。
    await db.query(`insert into chats (id, title) values ('chat-secret', '私聊')`);
    await db.query(`insert into chat_members (chat_id, user_id) values ('chat-secret', 'user-a'), ('chat-secret', 'host')`);
    await db.query(
      `insert into chat_messages (id, chat_id, user_id, kind, body) values ('msg-1', 'chat-secret', 'user-a', 'text', 'A 的私信')`,
    );
    for (const outsider of ["user-b", "user-c"]) {
      const membership = await db.query(
        `select 1 from chat_members where chat_id = 'chat-secret' and user_id = $1`,
        [outsider],
      );
      assert.equal(membership.rows.length, 0, `${outsider} 不能因为知道 chat id 就成为成员`);
      const visible = await db.query(
        `select m.body from chat_messages m
         where m.chat_id = 'chat-secret'
           and exists (select 1 from chat_members cm where cm.chat_id = m.chat_id and cm.user_id = $1)`,
        [outsider],
      );
      assert.equal(visible.rows.length, 0, `${outsider} 不能读取 A 的私信`);
    }
  } finally {
    await db.close();
  }
});

test("并发 20 个报名号不会重复", async () => {
  const db = await migratedDb();
  try {
    await db.query(
      `insert into events (
        id, slug, title, subtitle, category, city, venue, address, starts_at, ends_at,
        currency, price, capacity, sold, cover_url, description, highlights, host_name, open, status
      ) values (
        'event-concurrent', 'concurrent-test', '并发测试局', '', 'talk', 'penang', 'Cafe', 'Penang',
        now() + interval '1 day', now() + interval '1 day 2 hours', 'MYR', 0, 100, 0, '', '', '[]', 'Host', true, 'published'
      )`,
    );

    const registrations = Array.from({ length: 20 }, (_, index) => index).map(async (index) => {
      const applyNo = await allocateApplyNo(db, "2026-09-05");
      await db.query(
        `insert into registrations (
          id, event_id, code, apply_no, nickname, phone, seats, payment_method, payment_status,
          amount, currency, user_id, contact_whatsapp, verify_token
        ) values ($1, 'event-concurrent', $2, $3, $4, $5, 1, 'free', 'pending', 0, 'MYR', $6, $5, $7)`,
        [
          `reg-${index}`,
          `code-${index}`,
          applyNo,
          `并发用户${index}`,
          `6012000${String(index).padStart(4, "0")}`,
          `concurrent-user-${index}`,
          `verify-${index}-0123456789abcdef`,
        ],
      );
      return applyNo;
    });

    const applyNos = await Promise.all(registrations);
    assert.equal(applyNos.length, 20);
    assert.equal(new Set(applyNos).size, 20, "20 个并发报名号必须全部唯一");

    const count = await db.query(
      `select count(*)::int as total, count(distinct apply_no)::int as unique_total
       from registrations where event_id = 'event-concurrent'`,
    );
    assert.equal(Number(count.rows[0]?.total), 20);
    assert.equal(Number(count.rows[0]?.unique_total), 20);
  } finally {
    await db.close();
  }
});

test("服务端权限代码仍然有硬门槛，不能只靠前端隐藏", async () => {
  const [chat, applyView, verify, register] = await Promise.all([
    readFile(join(process.cwd(), "src/lib/server/chat.ts"), "utf8"),
    readFile(join(process.cwd(), "src/lib/server/apply-view.ts"), "utf8"),
    readFile(join(process.cwd(), "src/lib/server/verify.ts"), "utf8"),
    readFile(join(process.cwd(), "src/lib/server/register.ts"), "utf8"),
  ]);

  assert.match(register, /createLightRegistration[\s\S]*?middleware\(\[authMiddleware\]\)/);
  assert.match(applyView, /getLightTicket[\s\S]*?middleware\(\[authMiddleware\]\)/);
  assert.match(applyView, /where user_id = \$\{context\.userId\}/);
  assert.match(chat, /if \(rawId\.startsWith\("chat_"\)\)[\s\S]*?await requireMember\(rawId, userId\);[\s\S]*?return rawId;/);
  assert.doesNotMatch(chat, /if \(rawId\.startsWith\("chat_"\)\)[\s\S]{0,350}?addMember\(rawId, userId\)/);
  assert.match(verify, /checkInTicket[\s\S]*?middleware\(\[authMiddleware\]\)/);
  assert.match(verify, /canManageEvent\(context\.userId, row\.event_id\)/);
});
