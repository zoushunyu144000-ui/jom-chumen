# 任务看板

更新：2026-09-04。活任务参考 GitHub Issues，但**完成状态以当前代码 + CI 为准**。

## 已完成（不要重做）

- T00 核心产品：发现 / 报名 / 人工审核 / 票夹 / 登录 / 俱乐部 / 主办工作台 — **done**
- T01 正式 Postgres + production 禁止 PGLite fallback — **done**
- T03 报名号原子并发 + 唯一索引 — **done**
- T07 主办 WhatsApp + TNG 收款码 — **done**
- T15 真二维码 / verify token / 核销 / 撤票 — **done**
- T16 报名隐私 / chat ID 权限 / 主人主理人服务端权限 — **done**

## 本轮 P0

### T02 对象存储 — **done（代码）/ 待配置生产 R2**

- 新上传统一走 `uploadMediaObject`
- R2 优先，兼容 S3-compatible
- 客户端先压缩，服务端校验 MIME / 大小
- DB 保存 URL；`media_objects` 保存文件 metadata
- 老 Data URL 继续能读
- development 可 inline fallback
- production 未配置对象存储会明确拒绝上传

### T17 GitHub CI — **done**

`main` push 和指向 `main` 的 PR 自动跑 Node 22：

`npm ci` → `npm test` → `npm run typecheck` → `npm run check:auth` → `npm run build`

不自动部署，不写真实 secret。

### T18 核心业务回归 — **done**

覆盖：

- A 登录 / 报名 / apply_no / 审核 / 票 / verify / 核销 / 二次扫码 / 撤票
- B 不能用 A 的报名号读取 A 的资料
- B/C 不能读取不属于自己的私聊
- C 猜到 chat ID 也不会成为成员
- 20 个并发报名号全部唯一

## 本轮 P1

### T19 WhatsApp 分享卡 — **done**

- `/api/og/:slug` 总是 1200×630 JPEG
- PNG/WebP/JPEG 都会转 JPEG + cover crop
- 无封面用米白品牌兜底
- metadata 尺寸 / MIME 与响应一致
- public URL 不使用 example.com / Grok sandbox / git preview 域名

### T20 发活动图片收尾 — **done**

- 现有多选 / 封面 / 删除 / 左右排序 / 轮播不重做
- 新增“封面 / 第 N 张”标记
- 本轮不为了拖拽引入大依赖或重构

### T21 AI 富文本粘贴 — **done**

- Markdown
- ChatGPT / Claude / Gemini HTML
- 纯文本 fallback
- H1 / H2 / 粗体 / 无序与有序列表 / 引用 / 分隔线 / 链接 / 图片说明
- 结构化 JSON；不保存任意 HTML
- 危险标签丢弃，链接协议白名单
- 旧正文继续兼容

### T22 UI “拉取”文案 — **done（无需改代码）**

全仓搜索没有发现当前用户界面仍含“拉取”字样。

### T23 Vercel 重复项目清理 — **code clean / manual**

仓库未发现 `jom-chumen-app` 或旧 `chumen` 项目 ID / 部署配置残留。`.project_id` 是仓库工具元数据，不是 Vercel 项目绑定，本轮不乱删。

若 Vercel 后台两个旧项目仍连 GitHub：手动断开 `jom-chumen-app`、`chumen`；正式项目 `jom-chumen-2026` 保留。

## 仍需人工

- 创建 Cloudflare R2 并配置 `R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_URL`
- 正式站建议设置 `PUBLIC_SITE_URL=https://jom-chumen-2026.vercel.app`
- 如旧 Vercel 项目仍连接仓库，在 Vercel 后台断开它们

## P2（本轮不做）

- 普通俱乐部粉丝加入 / 退出 / 公开成员列表
- 全球城市数据重做
- WhatsApp Business API / 邮件通知
- 地图找局
- 英文 / 马来文
- 支付网关 / 付款自动出票
- 微信登录
- 自动退款
- 评价 / 举报
