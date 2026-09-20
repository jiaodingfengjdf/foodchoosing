# 本机生产部署

运行环境为 Node.js 24，使用 Express 同时提供 API 与前端生产构建。

在项目根目录执行：

```powershell
npm ci
npm run build
powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1
```

打开 http://localhost:3001/。启动脚本在后台运行服务，日志存于 `.runtime/server.log` 和 `.runtime/server.err.log`。服务不会自动随系统启动；重启电脑后再次执行启动脚本即可。已运行时请勿重复启动。

数据库保存在 `server/data/what-to-eat.db`，照片保存在 `server/uploads/`。重新构建不会清理这些数据；备份数据库时应先停止服务并同时保留 SQLite 的 WAL 文件。

关闭服务前，可检查 `.runtime/server.pid` 对应的进程仍是本项目的 Node 服务，再使用 `Stop-Process -Id <进程号>`。

## 2026-09-20 离线复验

使用生产构建、真实 Chromium 浏览器的离线网络模式和独立测试数据库验证：

- 在线抽菜后断网，使用缓存候选池抽菜，并显示离线提示。
- 离线抽出的菜可打开完整食谱。
- 评分、心得、照片离线暂存到 localStorage。
- 恢复联网后自动补交，队列清空，服务端新增一条带照片的打卡记录。
- 上述流程无页面 JavaScript 异常。

修复了转盘请求被请求库离线暂停、缓存食谱未用于详情页、生产 CSP 拦截本地图片处理三个问题，并补充回归测试。

离线能力依赖已加载的页面和缓存菜单；没有 Service Worker，完全断网时重新打开或刷新网站不属于当前支持范围。菜品 AI 顶图仍使用 Emoji 兜底。
