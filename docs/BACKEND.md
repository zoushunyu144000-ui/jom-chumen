# 后端现状（2026-09-03）

## 一句话

**现在没有独立后端。** 网站和接口是同一个 Node 进程（TanStack Start server functions）。浏览器调的是同域 RPC，不是 `/api/v1/...` REST。

给真人用之前，缺的是 **图片不要塞进数据库** 和 **报名号并发**，不是再写一套 Java/Go 服务。正式站 Postgres 已在 Neon。

## 运行时

| 层 | 实际是什么 |
| --- | --- |
| Web + RPC | TanStack Start（Vite / Nitro），Node 22 |
| 登录 | Better Auth，`/api/auth/*`。站点自己的 Google + 邮箱密码（线上不要走 auth.grok.me） |
| 数据库 | 有 `DATABASE_URL` → Neon/任意 Postgres。没有 → **内存 PGLite**（重启全丢） |
| 文件 | 封面/相册仍可能以 `data:image/...` 进库，页面经 `/api/media/:slug` 按需读。默认图在 `public/covers/` |
| 支付 | **无网关**。报名只留 TNG / 现金。库里只记方式和审核状态 |
| 消息 | 表 `messages`（通知）+ `chats` / `chat_messages`（私聊）。不是 WhatsApp Business API |
| 队列 / Redis / S3 | 没有 |

Schema 来源：`migrations/0001_auth.sql` … `0005_event_geo.sql`，以及 `ensureAppSchema()` 里的幂等 `alter table`（性别、退款、gallery_count、chat、club_members）。新字段优先走 migration 文件。

## 库表

**身份（Better Auth，camelCase 带引号）**

- `"user"` `"session"` `"account"` `"verification"`

**业务（snake_case）**

- `clubs`：主办人的俱乐部。`user_id` = 创建者
- `club_members`：创建者 + 被邀请的管理员。粉丝加入/退出/列表还没有
- `events`：活动。`user_id` 主办，`club_id` 所属俱乐部。`open` 控制是否还收申请。收款码和 WhatsApp 冗余在活动行上（发活动时从 `host_settings` 拷过来）。有 `refund_hours` / `refund_fee_percent` / `gallery_count`
- `registrations`：报名。`payment_status`、`apply_no`、手机、微信/WhatsApp、人数、金额、`refund_status`
- `profiles`：展示名、头像、标签、`gender`
- `host_settings`：主办人默认 WhatsApp 和三张收款码
- `messages`：站内通知
- `chats` / `chat_members` / `chat_messages`：私聊
- `_migrations`：已执行的 SQL 文件名

种子活动在 `src/lib/catalog.ts` 的 `EVENT_SEED` / `CLUB_SEED`，第一次查询时写入。演示数据，不是用户数据。

## 接口（server functions）

全部在 `src/lib/server/`。需要登录的挂了 `authMiddleware`。

| 模块 | 函数 |
| --- | --- |
| events / event-public / event-cards | 列表、详情（轻量，照片走 `/api/media`）、报名、查申请、票 |
| register | `createLightRegistration`（须登录） |
| clubs / host-lists | 俱乐部、我的局、工作台列表 |
| admin | 审报名、下架、导出 |
| event-edit / event-policy | 改活动、退款规则 |
| profile / gender | 资料、收款设置、注册性别 |
| people | 报名者头像、个人主页 |
| chat | 私聊、俱乐部聊、邀请管理员 |
| messages | 通知列表 |
| refund / apply-view | 申请退款、待确认页 |

权限：主办人或 `club_members` 里的管理员可改活动 / 审报名。没有平台超管。粉丝成员流未做。

报名同意后才把 `payment_status` 设为 `approved`，并给申请人推一条站内信。拒绝必须填原因。

## 环境变量

见 `.env.example`。上线最少要：

- `DATABASE_URL`（Postgres）
- `VITE_AUTH_ENABLED=true`
- `BETTER_AUTH_URL` = 公网 HTTPS 源（`https://jom-chumen-2026.vercel.app`）
- `BETTER_AUTH_SECRET`

Google 登录要站点自己的 `GOOGLE_CLIENT_*`。**换域名后 OAuth 会断。邮箱密码可以自己撑。**

## 已知后端缺口

1. 预览/未配库 = 内存库，不能当生产
2. 用户上传图以 Data URL 进 Postgres，体积和备份都会炸（页面已改 URL 读取，库还没迁对象存储）
3. 没有对象存储、没有 CDN 私有图
4. 没有真正的支付对账
5. 没有短信 / WhatsApp 官方通知，只有站内信 + `wa.me` 链接
6. 报名号序号用 `count(*)`，并发会撞号
7. 活动 `city` 仍是五个枚举，和全世界城市选择器不一致
8. 封面/收款码没有病毒扫描、大小限制只靠 zod 字符串长度
9. 正式站部署被 Hobby 日限额拦住时，GitHub `main` 会比线上新

---

## 能不能把后端挂到加州那台 Grok 云电脑？

**能跑进程，不适合当给东南亚用户用的生产机。**

### 这台机器适合干什么

- 给其他编程 Agent 拉这个 GitHub 仓库、改代码、跑 `npm test` / `typecheck`、提 PR
- 当开发机 / 预发，你自己 SSH 上去看

### 不适合当线上站的原因

1. **产品用户在槟城、吉隆坡、新加坡、曼谷。** 机器在加州，往返大概 180–250ms。能打开，但数据库和登录 cookie 都绕地球一圈，没有必要。
2. **Grok Bot 云电脑是 Agent 工作机**，不是机房。通常没有稳定的公网 443、证书、进程守护。关机、休眠、重装，网站就没了。
3. **现在前后端没拆。** 「只把后端挂过去」做不到，除非先把 server functions 抽成独立 API（这是后面的任务，不是现在的结构）。
4. **Google 登录绑的是站点回调域名。** 换成加州 IP 或随便一个域名会失败。邮箱密码仍可用。
5. **数据必须在 Postgres 里。** 把 Node 挂在加州、库还用内存 PGLite，等于没挂。

### 推荐部署（按优先级）

| 方案 | 给谁用 | 说明 |
| --- | --- | --- |
| A. 现在这条：Vercel + Neon（新加坡） | 真实用户 | 最少改动。正式域名 `jom-chumen-2026.vercel.app` |
| B. 新加坡 / 马来 VPS：Node 22 + Caddy + Postgres | 自建域名 | 要自己管 HTTPS、备份、`BETTER_AUTH_URL` |
| C. 加州 Grok 电脑只跑 Agent | 写代码的机器人 | **推荐给 Bot 用，不给终端用户用** |

若坚持自建（方案 B），清单：

- Node 22、`npm run build`、用进程管理（systemd / pm2）跑 Nitro 产物
- Postgres 16+，跑 `npm run db:migrate`
- 域名 + HTTPS（Caddy 最省事）
- 环境变量按 `.env.example`
- 图片改对象存储之后再对外开放上传
- 决定：继续用 Google OAuth，还是只留邮箱密码

**结论：Bot 的加州电脑用来协同写代码；用户访问的站和数据库放亚洲。不要把报名数据只存在那台开发机上。**
