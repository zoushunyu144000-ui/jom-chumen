# 免费部署（能存数据）

更新：2026-09-02

聊天窗口里的预览是临时环境，登录会转很久。  
**真正给大家用的网站，要「发布」一次。** 发布后的链接才是 Vercel，登录会快很多。

稳定后端 = **Postgres 一直在**，不是再租一台机器。

## 最快：构建页点「发布」（推荐）

这一下就会把网站放到 **Vercel**，并且自动配好能存数据的库。

1. 打开 Grok 里这个项目的 **构建页**（有预览的那一页）。
2. 找到右上角或页面上的 **「发布」** 按钮，点一下。
3. 等它显示成功，会给你一个 **https://…** 链接。
4. **把这个链接存下来**，用手机浏览器打开去登录。  
   不要再在聊天预览里登录——预览才会卡。

验证：用邮箱注册一个号 → 建俱乐部 → 关掉再打开，俱乐部还在。还在，就是稳的。

改完代码后要再点一次「发布」，线上才会变成新版本。

## 想挂到你自己的 Vercel 账号

你已经有 Vercel 团队 **zuriel144000**。要挂成 `jom-chumen.vercel.app` 这种自己的地址，需要先有 GitHub 仓库。我这边不能代建仓库。

请你先建一个空仓库：

1. 打开 [https://github.com/new](https://github.com/new)
2. Repository name 填 `jom-chumen`
3. 选 **Private**
4. **不要**勾选 Add a README
5. 点 Create repository
6. 回到这里说一声「仓库建好了」

然后我会把代码推上去，并接到你的 Vercel。数据库还要在 Vercel 里加一次 Neon（Storage → Create Database → Neon，选新加坡）。

## 不要用

| 东西 | 原因 |
| --- | --- |
| 聊天预览 | 临时环境，登录慢，重启丢数据 |
| 加州 Grok 云电脑 | 不是给用户访问的网站 |
| Render 免费 Postgres | 30 天过期会删库 |
| Railway 免费额度 | 几乎不够撑一个月常驻 |

## 自己另外部署时最少环境变量

- `DATABASE_URL` — Neon 连接串（用 **pooled** 那个）
- `VITE_AUTH_ENABLED=true`
- `BETTER_AUTH_URL` — 线上 HTTPS 地址
- `BETTER_AUTH_SECRET` — 随机长字符串

Google / X 登录换域名会断，邮箱密码仍可用。
