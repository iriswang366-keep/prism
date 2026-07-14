# 折光 (Prism) - 知识卡片应用

一个简洁优雅的知识卡片管理应用，帮助您收集、整理和连接知识碎片。

🌐 **在线体验**：[notewithprism.com](https://notewithprism.com)

> 📖 项目演进过程见 [DEVLOG.md](./DEVLOG.md)

> 本项目已从 NoCode 平台**完全解耦**，是一个标准的 Vite + React + Supabase 工程，
> 可在 Trae / VS Code 中继续开发，并部署到 Vercel / Netlify 等任意静态托管平台。
> **完整的部署与双机(Mac/Windows)协作流程见 [`DEPLOYMENT.md`](./DEPLOYMENT.md)。**

## 功能特性

- 📧 邮箱验证注册（Supabase Auth + Resend 自定义域名发信）
- ⚡ 闪电存入：粘贴长文/Markdown/网页链接一键存入，AI 自动生成摘要并提取标签
- 🗂️ 新用户自动播种预设笔记，快速上手
- 🏷️ 关键词自动标签 + 标签筛选
- 🧱 瀑布流知识集，卡片流式布局
- 🕸️ 知识图谱：可视化标签与笔记之间的关联
- 🎲 每日随机漫步：随机回顾旧笔记，可一键查看原文
- 📝 富文本编辑（TipTap，支持标题/加粗/列表/表格等）
- 🔍 关键词搜索与高亮
- 📐 侧边栏宽度可拖拽调节，自动记忆
- 🔐 用户级数据隔离（Supabase Auth + 行级安全 RLS）
- 📱 响应式设计

## 技术栈

- React 18
- Vite
- Tailwind CSS
- React Query
- React Router
- Supabase (后端数据库 + Auth + 行级安全 RLS)
- Resend (自定义域名邮件发信)
- Vercel (部署托管 + 自动 HTTPS)

## 安装和运行

### 前提条件

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 配置环境变量

复制 `.env.example` 文件为 `.env` 并填写你的 Supabase 配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 Supabase URL 和匿名密钥。

### 运行开发服务器

```bash
npm run dev
# 或
yarn dev
```

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

### 预览生产版本

```bash
npm run preview
# 或
yarn preview
```

## 环境变量说明

- `VITE_SUPABASE_URL`: Supabase 项目 URL
- `VITE_SUPABASE_ANON_KEY`: Supabase 匿名密钥

## 项目结构

```

src/
├── components/          # 可复用组件
├── lib/                 # 工具函数和配置
├── pages/               # 页面组件
├── App.jsx              # 应用入口
├── main.jsx             # React 入口
├── useResizable.js      # 自定义 Hook：拖拽调节侧边栏宽度
└── index.css            # 全局样式

```

## 测试

运行测试套件：

```bash
npm test
# 或
yarn test
```

## 代码检查

运行 ESLint 检查：

```bash
npm run lint
# 或
yarn lint
```

## 许可证

MIT
