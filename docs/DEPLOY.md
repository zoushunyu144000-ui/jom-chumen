# 免费部署（能存数据）

更新：2026-09-02

稳定后端 = **Postgres 一直在**，不是再租一台「服务器」。网站可以 serverless。

## 推荐（免费、和现在代码匹配）

1. **网站**：Vercel Hobby（免费）或 Grok 构建页直接「发布」（也是发到 Vercel）。
2. **数据库**：Neon Postgres 免费档（可选新加坡 `aws-ap-southeast-1`）。
   - 0.5 GB、会休眠，第一次打开可能慢一两秒
   - 够早期报名数据；封面不要再以 Data URL 进库
3. 发布时平台会注入 `DATABASE_URL`。本仓库已设 `deploy.database: true`。

预览环境仍是内存库，重启会丢。只有发布后的那份库是真的。

## 不要用

| 东西 | 原因 |
| --- | --- |
| 预览 / PGLite | 重启丢报名 |
| 加州 Grok 云电脑 | Agent 工作机，不是生产 |
| Render 免费 Postgres | 30 天过期会删库 |
| Railway 免费额度 | 几乎不够撑一个月常驻 |

## 自己另外部署时最少环境变量

- `DATABASE_URL` — Neon 连接串（用 **pooled** 那个）
- `VITE_AUTH_ENABLED=true`
- `BETTER_AUTH_URL` — 线上 HTTPS 地址
- `BETTER_AUTH_SECRET` — 随机长字符串

Google / X 登录换域名会断，邮箱密码仍可用。

## 验证数据是真的

发布后：注册一个号 → 建俱乐部 → 关掉再打开，俱乐部还在。还在，库就是稳的。
