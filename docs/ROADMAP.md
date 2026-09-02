# 任务目标与进度

更新：2026-09-03。活任务以 [GitHub Issues](https://github.com/zoushunyu144000-ui/jom-chumen/issues) 为准。做完就关 issue，并改这一页。

## 总目标

让东南亚华人能：**发现一局 → 提交申请 → 自己付款并加主办人 WhatsApp → 主办人确认 → 电子票进票夹。**

主办人能：**建俱乐部、发活动、改活动、审报名、导出名单。**

## 线上

- 站点：https://jom-chumen-2026.vercel.app
- Vercel：jom-chumen-2026 / zuriel144000
- 数据库：Neon（`DATABASE_URL` 已注入）

## 已完成

- [x] 发现页、分类、城市条、活动详情、富文本+图
- [x] 报名申请（pending）、报名号 `HD-YYYYMMDD-NNN`、重复手机号拦截
- [x] 待确认页：金额、收款码、WhatsApp 码、`wa.me`、警告文案
- [x] 查询报名、票夹（仅 approved / 旧 paid）
- [x] 邮箱密码登录（线上可用；要正确环境变量）
- [x] 谷歌登录改为站点自己的 OAuth（要 `GOOGLE_CLIENT_*`）
- [x] 线上停用 Grok 中转 Google / X（会跳 auth.grok.me）
- [x] 资料：名字、头像、标签
- [x] 俱乐部公开页 + 日历 + 往期
- [x] 发起 / 编辑活动、编辑俱乐部
- [x] 主办审核：同意 / 拒绝 / 备注 / 下架 / CSV
- [x] 站内消息
- [x] 底部栏：发现 / 俱乐部 / 发布 / 消息 / 我的
- [x] 全世界城市选择 + GPS（活动表仍只有五城枚举）
- [x] 人工审核，无支付网关
- [x] 部署到 Vercel + Neon；首页可打开
- [x] 修 Vercel 500（`i18n-iso-countries` 语言包缺失）

## 进行中 / 下一步（按优先级）

### P0 上线前必须

| Issue 主题 | 为什么 |
| --- | --- |
| 改对 Vercel 登录环境变量并 Redeploy | `BETTER_AUTH_URL` 不能是 example.com；缺 `BETTER_AUTH_SECRET` 邮箱登录不稳 |
| 用邮箱测通 `/login` | 验证 session cookie 落在 vercel.app 域名上 |
| （可选）自建 Google Cloud OAuth | Grok 中转不认 Vercel 回调 |
| 图片改对象存储 | Data URL 进 Postgres 会把免费 0.5GB 很快用完 |
| 报名号并发 | `count(*)+1` 会撞号 |

### P1 产品完整

| Issue 主题 | 为什么 |
| --- | --- |
| 俱乐部成员（加入/退出） | 现在俱乐部只有创建者，没有粉丝/成员 |
| 活动 `city` 对齐全世界选择器 | 选择器能选纽约，发活动还只能五城 |
| 主办人真实收款码 | 默认是占位 SVG |
| 申请后的可靠通知 | 只有站内信，主办人可能看不到 |
| 自建部署说明书（VPS，不是加州开发机） | Bot 云电脑不当生产 |

### P2 以后再说

- 评价、拉黑、举报
- 多主办人共管一个俱乐部
- 地图找局
- 英文 / 马来文
- 退款流程（仍人工，先把状态补全）
- 微信登录（没有开放平台就不要做）
- 真支付网关（产品明确暂不做）

## Agent 怎么领任务

1. 看 [Issues](https://github.com/zoushunyu144000-ui/jom-chumen/issues)?q=is%3Aopen
2. 认领：评论 `claim`，加上 label `in-progress`
3. 分支：`issue-N-short-name`
4. 打开 PR，正文写 `Closes #N`
5. 合入后更新本文件对应勾选

一次一个 issue。不要顺手重构支付、不要引入第二个 UI 语言。
