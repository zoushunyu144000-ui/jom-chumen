# 任务看板（GitHub Issue 镜像）

更新：2026-09-03 晚。活任务以 [GitHub Issues](https://github.com/zoushunyu144000-ui/jom-chumen/issues) 为准。

状态：`todo` / `in-progress` / `done` / `blocked`

## 总目标

东南亚华人：发现局 → 提交申请 → 自己付款并加 WhatsApp → 主办人确认 → 电子票。

## 已完成（不要重做）

- T00 发现 / 报名申请 / 人工审核 / 票夹 / 登录 / 俱乐部 / 主办工作台五栏 — **done**
- T01 持久 Postgres — **done**（正式站 `jom-chumen-2026` 已接 Neon；不要再把生产指到 PGLite）
- T07 主办人真实收款码 — **done**（发活动前必须 WhatsApp + TNG 真码；报名页可保存付款码）

## 今天（2026-09-03）产品改动 — 代码已在 main

详见 [Issue 进度](https://github.com/zoushunyu144000-ui/jom-chumen/issues)。预览和 GitHub 已齐；**正式站域名被 Vercel 免费额度拦住，还没吃到这批代码。**

## P0 上线前

### T04 生产域名与环境变量
- 状态：in-progress
- 正式站能打开、库是 Neon。还差：确认 `BETTER_AUTH_URL` / `BETTER_AUTH_SECRET` / 邮箱登录测通。
- **blocked：** 米色纸票海报要等 Vercel Hobby 部署额度重置（约 2026-09-04 16:13 马来西亚时间）才能打到 `https://jom-chumen-2026.vercel.app`。

### T02 图片对象存储
- 状态：todo
- 详情页已改成 `/api/media/...` 按需读，不再把整张图塞进页面 JSON。库里仍可能是 Data URL。上 S3/R2，库只存 URL。

### T03 报名号并发
- 状态：todo
- `HD-YYYYMMDD-NNN` 现在用 `count(*)+1`，并发会撞。改成序列或唯一约束重试。

## P1

### T05 俱乐部成员
- 状态：in-progress
- 已有 `club_members`、管理员邀请链接、管理员可审局。还缺：粉丝加入 / 退出 / 公开成员列表。

### T06 活动城市对齐全世界选择器
- 状态：todo
- 选择器已能选全球城市，发活动仍是五个枚举。

### T08 申请通知
- 状态：todo
- 新申请现在只写站内信。至少：WhatsApp 深链一键、可选邮件。不要假称已对接 WhatsApp Business。

### T09 自建部署说明书
- 状态：todo
- Node 22 + Caddy + Postgres，亚洲 VPS。明确：**加州 Grok 云电脑不当生产。**

## P2

### T10 评价 / 拉黑 / 举报 — todo
### T11 多主办人共管俱乐部 — todo（管理员邀请已有雏形）
### T12 地图找局 — todo
### T13 英文 / 马来文 — todo
### T14 人工退款状态 — in-progress（活动可设退款规则，用户可点申请退款；主办人处理流未完）

## 永久不做（除非产品改口）

- 支付网关、点一下就出票
- 微信登录
