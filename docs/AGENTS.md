# 给编程 Agent 的说明

你在参与 **Jom 出门局**。先读 [PRODUCT.md](PRODUCT.md)、[BACKEND.md](BACKEND.md)、[ROADMAP.md](ROADMAP.md)，再动代码。任务只从 GitHub Issue 来。

## 仓库

- GitHub：`https://github.com/zoushunyu144000-ui/jom-chumen`
- 默认分支：`main`
- 工作流：issue → 分支 `issue-N-slug` → PR → squash merge

## 硬性禁止

- 不要恢复自动成功的支付弹层 / PaymentSheet / 假网关
- 不要加微信登录
- 不要把 `VITE_AUTH_ENABLED` 关掉
- 不要把秘密写进仓库（`.env`、密钥、真实收款码原图若含账号二维码也要小心）
- 不要在 server function 里建表；新字段走 `migrations/0005_*.sql`
- 不要用 `pathname.startsWith("/club")` 判断主办 Tab（会命中 `/clubs`）
- 不要把 grok-build 沙盒的预览端口、内部 skill 写进用户可见文案

## 栈

TanStack Start、React 19、Tailwind v4、shadcn/Radix、Better Auth、`getSql()`（Neon 或 PGLite）。

改库表：新增 `migrations/0005_xxx.sql`，保持幂等（`if not exists`）。

改报名状态：`booked` = `approved` + 历史 `paid`。pending 不算占位成功，但算「这人已经申请过」。

## 本地

```bash
cp .env.example .env
npm install
npm run typecheck
npm test
npm run dev
```

无 `DATABASE_URL` 时 PGLite 内存库，重启即空。不要把这个行为当成生产设计。

## 加州 Grok 云电脑

那是 **写代码的机器**，不是用户访问的生产机。在上面：

- 可以：clone、改、测、push、开 PR
- 不可以：把唯一 Postgres、唯一 Node 进程、用户报名数据只放在那台机器上就当上线

用户站放亚洲（grok.me / Vercel / 新加坡 VPS）。理由见 BACKEND.md。

## PR 检查

- `npm run typecheck` 通过
- 动了报名 / 审核 / 登录，要手测对应路径
- 中文文案，不要 emoji 图标
- 每个 PR 关一个 issue
