# Jom 出门局

东南亚中文兴趣局报名产品。对标粗门：发现局、俱乐部发起、扫码付款、主办人人工确认。

**线上网址：** [https://jom-chumen-2026.vercel.app](https://jom-chumen-2026.vercel.app)

**GitHub：** [zoushunyu144000-ui/jom-chumen](https://github.com/zoushunyu144000-ui/jom-chumen)

| 文档 | 给谁看 |
| --- | --- |
| [docs/PRODUCT.md](docs/PRODUCT.md) | 产品目标、角色、硬约束 |
| [docs/BACKEND.md](docs/BACKEND.md) | 后端现状、库表、接口、能不能挂加州机器 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 已完成 / 进行中 / 下一步 |
| [docs/TASKS.md](docs/TASKS.md) | 任务编号与状态 |
| [docs/AGENTS.md](docs/AGENTS.md) | 其他编程 Agent 的开工说明 |
| [Issues](https://github.com/zoushunyu144000-ui/jom-chumen/issues) | 任务看板。领 issue → 开分支 → PR |

## 现在能做什么

- 发现活动（槟城 / 吉隆坡 / 新山 / 新加坡 / 曼谷）
- 报名申请：必须先登录。提交 ≠ 成功。用户自己转 TNG 或现场现金，加 WhatsApp，主办人点同意才出票
- 电子票：票夹里可保存米色纸票海报（封面、出门徽章、二维码）
- 登录：Google、邮箱密码；注册问性别
- 俱乐部：创建、发活动、改资料、邀请管理员
- 主办工作台（底部「俱乐部」）：审报名、改活动、收款设置（WhatsApp + TNG 必填）
- 票夹、查询报名号、站内消息 / 私聊
- 活动可写退款规则；用户可申请退款

## 明确不做（直到产品改口）

- 不接微信 / 支付宝 / Stripe / TNG 支付网关。不要恢复任何「点了就成功」的假支付
- 不发明微信登录
- 不把报名成功写成自动到账

## 技术栈

TanStack Start + React + Tailwind v4 + Better Auth + Postgres（Neon 或 PGLite 兜底）

本地：

```bash
cp .env.example .env
npm install
npm run dev
```

没有 `DATABASE_URL` 时用内存库，**重启就丢数据**。要给真人用，必须接上 Postgres。

线上 Vercel 需要：`DATABASE_URL`、`VITE_AUTH_ENABLED=true`、`BETTER_AUTH_URL=https://jom-chumen-2026.vercel.app`、`BETTER_AUTH_SECRET`。

## 任务进度（2026-09-03 晚）

- 产品闭环（发现 → 登录报名 → 人工确认 → 米色纸票）代码已在 `main`
- 正式站 https://jom-chumen-2026.vercel.app 有 Neon，但仍是额度拦住之前的旧构建；纸票海报还没上到这个域名
- 登录要环境变量正确；见 [Issue #1](https://github.com/zoushunyu144000-ui/jom-chumen/issues/1)
- 今日问题对照：[Issue #2](https://github.com/zoushunyu144000-ui/jom-chumen/issues/2)、[docs/ROADMAP.md](docs/ROADMAP.md)、[docs/TASKS.md](docs/TASKS.md)
