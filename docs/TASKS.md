# 任务看板（GitHub Issue 镜像）

GitHub 仓库一旦能推送，这些会变成 Issue。Agent 领任务请改状态，并在 PR 里写 `Closes Txx`。

状态：`todo` / `in-progress` / `done` / `blocked`

## 总目标

东南亚华人：发现局 → 提交申请 → 自己付款并加 WhatsApp → 主办人确认 → 电子票。

## 已完成（不要重做）

- T00 发现 / 报名申请 / 人工审核 / 票夹 / 登录 / 俱乐部 / 主办工作台五栏 — **done**

## P0 上线前

### T01 持久 Postgres
- 状态：todo
- 接 `DATABASE_URL`（Neon 建议新加坡）。确认重启后报名还在。
- 不要再把生产指到 PGLite。

### T02 图片对象存储
- 状态：todo
- 封面、头像、收款码不要以 Data URL 进 Postgres。上 S3/R2/兼容存储，库里只存 URL。

### T03 报名号并发
- 状态：todo
- `HD-YYYYMMDD-NNN` 现在用 `count(*)+1`，并发会撞。改成序列或唯一约束重试。

### T04 生产域名与环境变量
- 状态：todo
- `BETTER_AUTH_URL`、`BETTER_AUTH_SECRET`、HTTPS。写清 grok.me 与自建两套。

## P1

### T05 俱乐部成员
- 状态：todo
- `club_members` 表：加入 / 退出 / 成员列表。现在俱乐部只有创建者。

### T06 活动城市对齐全世界选择器
- 状态：todo
- 选择器已能选全球城市，发活动仍是五个枚举。

### T07 主办人真实收款码
- 状态：todo
- 默认 SVG 只是占位。上传微信/支付宝/TNG 码，活动页要用主办人自己的。

### T08 申请通知
- 状态：todo
- 新申请现在只写站内信。至少：WhatsApp 深链一键、可选邮件。不要假称已对接 WhatsApp Business。

### T09 自建部署说明书
- 状态：todo
- Node 22 + Caddy + Postgres，亚洲 VPS。明确：**加州 Grok 云电脑不当生产。**

## P2

### T10 评价 / 拉黑 / 举报 — todo
### T11 多主办人共管俱乐部 — todo
### T12 地图找局 — todo
### T13 英文 / 马来文 — todo
### T14 人工退款状态 — todo

## 永久不做（除非产品改口）

- 支付网关、点一下就出票
- 微信登录
