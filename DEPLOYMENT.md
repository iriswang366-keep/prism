# 折光 (Prism) · 部署与继续开发指南

本指南面向「已从美团 NoCode 平台解耦、可独立部署」后的折光项目，涵盖:
本地开发 → 双机(Mac/Windows)协作 → Supabase 数据库配置 → Vercel 上线。

> 本次改造已完成:去除 NoCode 平台耦合、Supabase 密钥改为环境变量读取、
> 合并冲突的数据库迁移为单一权威脚本(严格的用户级数据隔离)、补齐富文本样式、
> 修复搜索高亮崩溃、瀑布流布局、清理调试日志。项目现在是一个标准的
> Vite + React + Supabase 工程,可在任意静态托管平台部署。

---

## 一、本地启动(任意一台电脑)

前提:安装 [Node.js 18+](https://nodejs.org/) 和 [Trae](https://www.trae.ai/)(或 VS Code)。

```bash
# 1. 安装依赖(每台机器首次都要跑一次)
npm install

# 2. 配置环境变量:复制模板并填入 Supabase 凭据
cp .env.example .env
#   然后编辑 .env,填入下面「二、Supabase 配置」拿到的两个值

# 3. 启动开发服务器(默认 http://localhost:8080)
npm run dev
```

> 项目根目录已附带一个可直接使用的 `.env`(沿用原 NoCode 自带的 Supabase 库)。
> 若你要用自己的 Supabase 项目,按「二」重建并替换即可。

---

## 二、Supabase 配置

### 2.1 获取现有凭据(沿用原数据库,最省事)
项目当前 `.env` 里已经填好了原有 Supabase 的 `VITE_SUPABASE_URL` 与
`VITE_SUPABASE_ANON_KEY`,开箱即可跑。缺点:数据库仍托管在原平台,不完全属于你。

### 2.2 迁移到你自己的 Supabase(推荐,完全独立)
1. 到 [supabase.com](https://supabase.com/) 注册并新建一个项目(免费额度足够个人使用)。
2. 进入 **Project Settings → API**,复制:
   - `Project URL` → 填到 `.env` 的 `VITE_SUPABASE_URL`
   - `anon public` key → 填到 `.env` 的 `VITE_SUPABASE_ANON_KEY`
3. 进入 **SQL Editor**,把 `src/supabase/migrations/0001_init_notes.sql` 的
   全部内容粘贴进去并执行一次。它会:
   - 创建 `notes` 表(含 `user_id` 外键关联 `auth.users`)
   - 开启行级安全(RLS),确保**每个用户只能读写自己的笔记**
   - 清理历史遗留的宽松策略和废弃的微信/QQ 用户表
4. 进入 **Authentication → Providers**,确认 **Email** 已启用。
   (登录方式已统一为 Supabase 邮箱 + 验证码,无需再配置微信/QQ。)

---

## 三、双机协作:Mac 写一半,Windows 接着写

Trae 在 Mac 和 Windows 上都能运行,跨机器同步靠 **Git / GitHub**,而不是拷文件夹。

### 3.1 一次性设置(在其中一台机器上)
```bash
git init
git add .
git commit -m "init: 折光独立部署版"
# 在 GitHub 新建一个【私有】仓库,然后:
git remote add origin git@github.com:你的用户名/prism.git
git push -u origin main
```

### 3.2 日常切换流程
| 场景 | 操作 |
|---|---|
| 某台机器写完、准备离开 | `git add . && git commit -m "..." && git push` |
| 到另一台机器初次拉取 | `git clone <仓库地址>`,进目录后 `npm install` |
| 到另一台机器继续 | `git pull`,再开始改 |

**铁律:开工前先 `git pull`,收工后先 `git push`。**

### 3.3 两个必须注意的点
- **`node_modules/` 不进 Git**(已在 `.gitignore` 忽略):它是几百 MB 的依赖包,
  且含平台相关二进制。每台机器 `git clone` 后各自 `npm install` 生成。
- **`.env` 不进 Git**(已在 `.gitignore` 忽略):里面是密钥。
  在**每台新机器上手动创建**一份 `.env`,填入相同的两个 `VITE_` 变量。

---

## 四、部署到 Vercel(上线,免费)

1. 把代码推到 GitHub(见上)。
2. 登录 [vercel.com](https://vercel.com/),**Add New → Project**,导入该仓库。
3. Vercel 会自动识别为 Vite 项目,默认配置即可:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 在 **Settings → Environment Variables** 添加两个变量(和本地 `.env` 一致):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. 点击 **Deploy**。之后每次 `git push` 都会自动触发重新部署。

> Netlify 流程几乎相同:Build 命令 `npm run build`,发布目录 `dist`,
> 同样在后台配置这两个环境变量。

### 关于登录回调
本项目使用 `HashRouter`(URL 形如 `/#/`),部署到任何静态平台都无需额外的
重写规则(rewrite),不会出现刷新 404。邮箱验证回调页为 `/#/auth/callback`。

---

## 五、常见问题

- **打开就卡在「正在初始化...」**:多半是 `.env` 没配或变量名拼错。确认根目录有
  `.env`,且变量以 `VITE_` 开头、值无多余引号或空格。
- **登录后看不到笔记 / 报权限错误**:确认已在 Supabase SQL Editor 执行过
  `0001_init_notes.sql`,且 Authentication 里 Email provider 已启用。
- **改了 `.env` 不生效**:Vite 只在启动时读环境变量,改完要重启 `npm run dev`。

---

祝使用愉快 🔶
