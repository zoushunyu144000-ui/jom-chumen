# 任务目标与进度

更新：2026-09-03 晚。今日问题对照：[Issue #2](https://github.com/zoushunyu144000-ui/jom-chumen/issues/2)。登录环境变量：[Issue #1](https://github.com/zoushunyu144000-ui/jom-chumen/issues/1)。做完就关 issue，并改这一页。

## 总目标

让东南亚华人能：**发现一局 → 提交申请 → 自己付款并加主办人 WhatsApp → 主办人确认 → 电子票进票夹。**

主办人能：**建俱乐部、发活动、改活动、审报名、导出名单。**

## 线上

- 站点：https://jom-chumen-2026.vercel.app （有 Neon，能报名）
- GitHub `main`：`09a2619` 起含米色纸票海报
- Vercel 项目：jom-chumen-2026 / zuriel144000
- **正式站目前仍停在更早的提交**（Hobby 部署次数用完）。重复项目 `jom-chumen-app` / `chumen` 已暂停，避免继续烧额度。

## 已完成

- [x] 发现页、分类、城市条、活动详情、富文本+图
- [x] 报名申请（pending）、报名号 `HD-YYYYMMDD-NNN`、重复手机号拦截
- [x] 待确认页：金额、收款码、WhatsApp 码、`wa.me`、警告文案
- [x] 查询报名、票夹（仅 approved / 旧 paid）
- [x] 邮箱密码登录（线上可用；要正确环境变量）
- [x] 谷歌登录改为站点自己的 OAuth（要 `GOOGLE_CLIENT_*`）
- [x] 线上停用 Grok 中转 Google / X（会跳 auth.grok.me）
- [x] 资料：名字、头像、标签、注册问性别
- [x] 俱乐部公开页 + 日历 + 往期
- [x] 发起 / 编辑活动、编辑俱乐部
- [x] 主办审核：同意 / 拒绝 / 备注 / 下架 / CSV
- [x] 站内消息 + 私聊（图、表情、连续两条上限、键盘顶起）
- [x] 底部栏：发现 / 俱乐部 / 发布 / 消息 / 我的
- [x] 全世界城市选择 + GPS（活动表仍只有五城枚举）
- [x] 人工审核，无支付网关
- [x] 部署到 Vercel + Neon；首页可打开
- [x] 修 Vercel 500（`i18n-iso-countries` 语言包缺失）
- [x] 报名必须登录；支付方式只留 TNG / 现金
- [x] 发活动强制 WhatsApp + TNG 真码
- [x] 电子票可导出米色纸票海报（封面、出门徽章、二维码）
- [x] 活动页分享卡用封面 JPEG，不再出黑底默认图（预览/GitHub 已齐）
- [x] 活动图按 URL 读，详情不再把照片 blob 打进页面
- [x] 退款规则写在活动上，用户可申请退款
- [x] 报名者头像条、个人主页
- [x] 俱乐部管理员邀请链接

## 今天还没落地到正式站 / 没做完

| 项 | 状态 |
| --- | --- |
| 米色纸票海报上到 jom-chumen-2026.vercel.app | **blocked** 免费部署额度，约明天 16:13 马时重置后自动再发 |
| 登录环境变量测通（Issue #1） | in-progress |
| 图片对象存储（库里不再存 Data URL） | todo |
| 报名号并发 | todo |
| 俱乐部粉丝加入/退出/成员列表 | 管理员邀请已有，粉丝流未做 |
| 申请后 WhatsApp/邮件通知 | todo |
| 发活动城市对齐全世界选择器 | todo |
| 主办人处理退款 | 用户能申请，主办处理未完 |

## 进行中 / 下一步（按优先级）

### P0 上线前必须

| Issue 主题 | 为什么 |
| --- | --- |
| 正式站吃到 main（纸票海报） | 被 Hobby 日限额拦住 |
| 改对 Vercel 登录环境变量并 Redeploy | `BETTER_AUTH_URL` 不能是 example.com |
| 用邮箱测通 `/login` | 验证 session cookie 落在 vercel.app 域名上 |
| 图片改对象存储 | Data URL 进 Postgres 会把免费 0.5GB 很快用完 |
| 报名号并发 | `count(*)+1` 会撞号 |

### P1 产品完整

| Issue 主题 | 为什么 |
| --- | --- |
| 俱乐部成员（加入/退出） | 现在主要是创建者 + 被邀请的管理员 |
| 活动 `city` 对齐全世界选择器 | 选择器能选纽约，发活动还只能五城 |
| 申请后的可靠通知 | 只有站内信，主办人可能看不到 |
| 自建部署说明书（VPS，不是加州开发机） | Bot 云电脑不当生产 |

### P2 以后再说

- 评价、拉黑、举报
- 多主办人共管一个俱乐部（邀请管理员已有雏形）
- 地图找局
- 英文 / 马来文
- 退款：主办人处理流
- 微信登录（没有开放平台就不要做）
- 真支付网关（产品明确暂不做）

## Agent 怎么领任务

1. 看 [Issues](https://github.com/zoushunyu144000-ui/jom-chumen/issues)?q=is%3Aopen
2. 认领：评论 `claim`，加上 label `in-progress`
3. 分支：`issue-N-short-name`
4. 打开 PR，正文写 `Closes #N`
5. 合入后更新本文件对应勾选

一次一个 issue。不要顺手重构支付、不要引入第二个 UI 语言。
