# Prism 数据库定时维护

GitHub Actions 每天北京时间约 01:17、09:17、17:17 执行一次数据库健康检查。
执行地点是 GitHub 云端，不需要本机开机、Codex 运行或网站账号登录。

工作流：`.github/workflows/supabase-healthcheck.yml`

它使用网站已公开的低权限 anon key，向实际生产项目
`uezpbmuprzxmyiuuhuej` 的 PostgREST `notes` 表发送一次 `SELECT id LIMIT 1`。
现有行级权限应让匿名请求返回空数组。脚本只有在 HTTP 200 且结果为空数组时
报告成功；不创建、修改、删除笔记，不输出笔记内容或密钥。网络和服务暂时异常
最多重试两次，最终失败会让 Actions 运行显示失败。

## 检查与手动运行

进入 https://github.com/iriswang366-keep/prism/actions/workflows/supabase-healthcheck.yml
查看运行记录，也可以点击 Run workflow 立即检查。
GitHub 的失败通知受账号 Actions 通知设置控制。

本地验证（Node.js 和 curl 已安装时）：

```sh
node scripts/supabase-healthcheck.mjs
```

## 限制与后续维护

- Supabase 根据过去一周的数据库活跃程度决定是否暂停免费项目；每天少量请求
  通常足够，但这不是官方免暂停保证。
- GitHub 定时任务可能延迟或被跳过。应关注失败通知、Supabase 暂停预警和运行记录。
- 已暂停的项目需要先在 Supabase 控制台恢复；这个健康检查不具备管理权限。
- 轮换公开 key 后，在仓库 Settings → Secrets and variables → Actions → Variables
  中设置 `PRISM_SUPABASE_PUBLIC_KEY`。只使用该项目的 publishable 或 anon key，
  不要提供 service_role/secret key 或用户登录令牌。
- 如果迁移了数据库项目，更新脚本的项目 ref 和公开 key，并手动运行验证。
- 本仓库为私有仓库。若改为公开仓库，GitHub 会在仓库连续 60 天没有活动时
  停用定时工作流，需要重新启用。

参考：
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/guides/api
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
