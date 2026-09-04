# 后端现状（2026-09-04）

## 一句话

JOM 仍是 **TanStack Start 同一个 Node 22 应用 + Postgres**，没有拆第二套后端，也没有支付网关。正式流程仍是：

**用户报名 → 自己 TNG / 现金付款 → WhatsApp 联系主办 → 主办人工确认 → 电子票。**

## 运行时

| 层 | 当前实现 |
| --- | --- |
| Web + RPC | TanStack Start / Nitro，Node 22 |
| 登录 | Better Auth，邮箱密码 + 站点自己的 Google OAuth |
| 数据库 | 正式环境 Postgres / Neon；`VERCEL_ENV=production` 缺 `DATABASE_URL` 会直接失败，不能退回 PGLite |
| 文件 | 新上传走服务端 S3-compatible 对象存储，Cloudflare R2 为推荐实现 |
| 支付 | 无支付网关；只记录 TNG / 现金和主办人工审核状态 |
| 消息 | 站内信 + 私聊；不是 WhatsApp Business API |

## 对象存储

入口统一为 `src/lib/server/storage.ts` 的 `uploadMediaObject`。

新上传覆盖：

- 活动封面 / 相册
- 活动正文插图
- 用户头像
- 俱乐部头像 / 封面
- TNG / 微信 / 支付宝收款码
- 私信图片 / 文件

规则：

1. 客户端图片先压缩，再交给服务端。
2. secret 只在服务端读取，浏览器拿不到。
3. 文件 key 使用随机 UUID，避免覆盖。
4. 服务端校验 MIME 和大小。
5. 数据库业务字段只保存 URL；`media_objects` 记录 object key、文件名、MIME、大小、用途等 metadata。
6. 旧 `data:image/...` / Data URL 数据继续能读，不要求本轮批量搬迁。
7. development 没配对象存储时允许明确的 inline fallback。
8. production 没配对象存储时直接报错，**禁止偷偷继续把大文件塞进 Postgres**。

### Cloudflare R2

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
```

也支持通用 S3-compatible 配置，`S3_*` 优先于 `R2_*`：

```env
S3_ENDPOINT=
S3_REGION=auto
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=
S3_PUBLIC_URL=
```

`R2_PUBLIC_URL` / `S3_PUBLIC_URL` 必须是浏览器可以访问对象的公开基础 URL。

## 关键表

- Better Auth：`user` / `session` / `account` / `verification`
- `clubs` / `club_members`
- `events`
- `apply_counters`
- `registrations`
- `profiles`
- `host_settings`
- `messages`
- `chats` / `chat_members` / `chat_messages`
- `media_objects`
- `_migrations`

Schema 以 `migrations/` 为准；对象存储 metadata 在 `0007_storage.sql`。

## 已完成的 P0 安全线

- 报名号用 `apply_counters` 原子 +1，`apply_no` 有唯一索引。
- 电子票有高随机 `verify_token` 和 `/verify/<token>`。
- 看自己的报名 / 票必须登录并服务端按 `user_id` 限制。
- 猜到 `chat ID` 不会自动加入聊天。
- 主人 / 主理人权限在服务端检查。
- 主办可核销、撤票、取消活动。
- 正式环境缺 Postgres 时禁止 PGLite fallback。

## 自动质检

`.github/workflows/ci.yml` 在：

- push 到 `main`
- pull request 指向 `main`

使用 Node 22 自动执行：

1. `npm ci`
2. `npm test`
3. `npm run typecheck`
4. `npm run check:auth`
5. `npm run build`

CI 不自动部署，也不需要 Production `DATABASE_URL`。CI 使用 preview/test 环境，因此不会绕过生产数据库安全规则。

## 分享图

`/api/og/:slug` 会把 PNG / WebP / JPEG / 任意比例封面统一处理为 **1200×630 JPEG**。没有封面时使用米白品牌兜底图。页面 metadata 固定声明同样的尺寸和 `image/jpeg`。

## 仍未做

- 历史 Data URL 批量迁移（本轮只保证旧数据继续读、新数据不再写进去）
- 俱乐部普通粉丝加入 / 退出 / 公开成员列表
- WhatsApp Business API / 邮件通知
- 全球城市数据结构重做
- 支付网关 / 自动退款 / 评价 / 举报 / 多语言

这些不影响本轮稳定性收尾，也不要为了它们大重构。
