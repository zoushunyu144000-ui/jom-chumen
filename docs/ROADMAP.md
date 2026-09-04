# 任务目标与进度

更新：2026-09-04（收尾与稳定性轮）。**状态以当前 `main` 真实代码为准，不按旧 Issue 文字倒推。**

## 产品主流程

**发现活动 → 登录报名 → 自己 TNG / 现金付款 → WhatsApp 联系主办 → 主办人工确认 → 电子票 → 主办现场核销。**

本阶段明确不接支付网关，不做“付款后自动出票”。

## 已完成，不要重做

- [x] 真二维码电子票 + `/verify/<token>`
- [x] 报名号原子计数 + 唯一索引
- [x] 报名 / 票隐私：只能读自己的
- [x] 猜 chat ID 不会自动加入聊天
- [x] 主人 / 主理人服务端权限
- [x] 撤票、取消活动
- [x] 活动图片多选、第一张封面、详情轮播
- [x] 私信轮询刷新
- [x] production 缺 `DATABASE_URL` 禁止 PGLite fallback

## 本轮稳定性收尾

### P0

- [x] GitHub Actions CI：Node 22，`npm ci` → test → typecheck → auth invariant → build
- [x] 新上传改走 S3-compatible 对象存储，Cloudflare R2 优先
- [x] 生产未配置对象存储时拒绝上传，不回退 base64 入库
- [x] 旧 Data URL 数据继续可读，本轮不批量搬历史数据
- [x] 业务链路回归测试：报名 → 审核 → 票 → 验票 → 核销 → 再扫 → 撤票
- [x] 回归测试覆盖报名隐私、私聊权限、猜 chat ID、20 个并发报名号

### P1

- [x] WhatsApp / OG 分享图统一 1200×630 JPEG，封面裁切 + 品牌兜底
- [x] Production public URL 过滤 example / Grok sandbox / Vercel git preview
- [x] PhotoStrip 显示“封面 / 第 2 张 / 第 3 张…”；保留稳定的左右箭头排序，不为拖拽大改页面
- [x] AI 富文本粘贴：Markdown + ChatGPT/Claude/Gemini HTML + 纯文本 fallback
- [x] 正文结构支持 H1/H2、粗体、无序/有序列表、引用、分隔线、链接、图片说明
- [x] 不保存任意 HTML；script/style/iframe 等丢弃，链接只允许 http/https/mailto
- [x] 旧正文 JSON 继续兼容
- [x] 全仓代码搜索未发现仍在用户界面使用“拉取”文案，因此无需为此制造无意义改动
- [x] 代码侧未发现 `jom-chumen-app` / 旧 `chumen` Vercel 项目绑定残留

## 需要人工配置后才真正可用

- Cloudflare R2：创建 bucket / API token / 公共访问 URL，并把 `R2_*` 环境变量填进正式 Vercel 项目。
- 正式站建议显式设置 `PUBLIC_SITE_URL=https://jom-chumen-2026.vercel.app`。
- Vercel 后台：只保留 `jom-chumen-2026` 连 GitHub；旧 `jom-chumen-app`、`chumen` 若仍连接同一仓库，需要在 Vercel 后台断开 GitHub 集成。代码仓库不需要为此删除正式配置。

## P2 / 本轮不做

- 普通俱乐部粉丝加入 / 退出 / 公开成员列表
- 全球城市数据结构重做
- WhatsApp Business API
- 邮件通知
- 地图找局
- 英文 / 马来文
- 支付网关
- 微信登录
- 自动退款
- 评价系统
- 举报系统

## 原则

一次只修明确问题；关键权限必须服务端检查；新字段兼容旧数据；secret 不进 GitHub；不换技术栈、不大重构。
