# 实施路线图 (Implementation Roadmap)

## 当前版本状态 (v0.1.x)

**核心已完成：**
- Next.js 16 前端（双模式编辑、搜索、AI 对话、图谱、10 个渲染器插件）
- MCP Server（20+ 工具，stdio + HTTP 双传输，Bearer Token 认证）
- CLI（onboard / start / open / sync / mcp install / gateway daemon）
- MindOS Skills（EN + ZH，28 条 evals）
- 中英双语模板
- CI/CD 自动同步 + Landing Page 部署

**P1 已完成：**
1. ~~**太本地化**~~ — Git 自动同步已内置（`mindos sync`），跨设备自动 commit/push/pull
2. ~~**CLI-only 入口**~~ — onboard 默认启用 daemon，`mindos open` 一键打开浏览器

---

## P0 — 近期修复 & 优化

| 项 | 类别 | 状态 |
|---|------|------|
| 首页布局：Search Files 与 Ask AI 调换位置，突出 AI-native 特性 | UI | 待做 |
| 首页：Plugins 放在 Recently Modified 上方 | UI | 待做 |
| 首页：New Note 按钮重命名 + 修复 404 | Bug | 待做 |
| 移动端 Landing Page Topbar 显示问题 | Bug | 待做 |
| 历史对话的持久化与管理 | Feature | 待做 |
| 优化模板内容 | Content | 待做 |
| 优化 Skill 工作流指引 | Content | 持续 |

---

## P1 — 零门槛启动 + 跨设备同步（解决两个结构性问题）

> 目标：用户 `npm install -g` 之后，打开浏览器就能用；换设备时数据自动同步。

### Phase 1A: Gateway 默认自启动（1 周）

**问题**：`mindos start` 是手动操作，用户装完 CLI 后不知道还要启动 Web UI。

| 任务 | 说明 | 状态 |
|------|------|------|
| `mindos onboard` 默认启用 daemon | onboard Step 7 交互选择启动方式，默认"后台服务"，自动安装 daemon | ✅ 已完成 |
| 系统托盘通知 | daemon 启动后推送一条系统通知："MindOS 已就绪，打开 http://localhost:3000" | ✅ 已完成 |
| `mindos open` 命令 | 一键在默认浏览器打开 Web UI（macOS/Linux/WSL） | ✅ 已完成 |
| 首次启动引导页 | 浏览器打开后如果知识库为空，展示交互式引导（选择模板 → 导入已有笔记 → 连接 Agent） | 待做 |

**交付标准**：用户执行 `npm i -g @geminilight/mindos && mindos onboard`，之后每次开机 Web UI 自动可用。

### Phase 1B: Git 同步内置化（2 周）

**问题**：跨设备同步目前需要用户自己 `git push/pull`，没有自动化。

| 任务 | 说明 | 状态 |
|------|------|------|
| `mindos sync init` | 交互式配置远程 Git repo（GitHub/GitLab/Gitee），自动设置 SSH key 或 token | ✅ 已完成 |
| 自动 commit + push | daemon 监听文件变更（chokidar），debounce 30s 后自动 `git add -A && git commit && git push` | ✅ 已完成 |
| 自动 pull + merge | daemon 启动时和定时（每 5 min）执行 `git pull --rebase`，冲突时保留双方（`.sync-conflict` 文件） | ✅ 已完成 |
| `mindos sync status` | 显示同步状态：最后同步时间、未推送 commit 数、冲突文件列表 | ✅ 已完成 |
| Web UI 同步面板 | Settings → Sync 标签页，可视化同步状态 + 手动触发 + 冲突解决 | ✅ 已完成 |

**交付标准**：用户在设备 A 记笔记，设备 B 在 5 分钟内自动可见；冲突不丢数据。

### Phase 1C: Streamable HTTP 开箱即用（1 周）

**问题**：MCP HTTP transport 已实现，但需要手动配置端口和 token。

| 任务 | 说明 | 状态 |
|------|------|------|
| `mindos token` 增强 | 输出可直接粘贴的 MCP 配置 JSON（包含 URL + Bearer Token），分 Agent 输出（Claude Code / CodeBuddy / Cursor / Remote） | ✅ 已完成 |
| 局域网自动发现 | daemon 广播 mDNS/Bonjour 服务，同局域网设备可发现 MindOS 实例 | 待做 |

**交付标准**：手机/平板上的 Agent 通过 HTTP 连上家里电脑的 MindOS。

---

## P2 — 云端 Hub + 非 CLI 用户（解决 CLI 依赖问题）

> 目标：不会用终端的用户也能用 MindOS；数据同步不依赖 Git。

### Phase 2A: MindOS Cloud Hub（4-6 周）

| 任务 | 说明 | 优先级 |
|------|------|--------|
| Hub API 设计 | RESTful API：注册/登录 + 知识库 CRUD + 文件同步（基于 last-modified 或 vector clock） | 高 |
| Hub 服务搭建 | Node.js + PostgreSQL（元数据）+ S3/R2（文件存储），部署到 Vercel/Cloudflare | 高 |
| 本地 daemon 集成 | `mindos sync` 支持 `--provider=hub`（默认）和 `--provider=git`（现有） | 高 |
| 端到端加密 | 本地加密后上传，Hub 只存密文，密钥由用户保管 | 高 |
| 免费额度设计 | 100MB 免费存储 + 无限设备数，Pro 版（$5/月）解锁 1GB + 团队共享 | 中 |

### Phase 2B: 一键安装器（2 周）

| 任务 | 说明 | 优先级 |
|------|------|--------|
| macOS .dmg 安装包 | Tauri 或 pkg 打包，安装后自动注册 launchd daemon + 创建菜单栏图标 | 高 |
| Windows .msi 安装包 | 同上，注册 Windows Service + 系统托盘 | 高 |
| 安装引导 Web 页面 | mindos.dev/install — 检测 OS，一键下载对应安装包，替代 `npm install -g` | 中 |

**交付标准**：非开发者用户下载 → 双击安装 → 打开浏览器 → 开始使用，全程无终端。

### Phase 2C: 移动端适配（2 周）

| 任务 | 说明 | 优先级 |
|------|------|--------|
| PWA 支持 | 添加 manifest.json + service worker，支持"添加到主屏幕" | 高 |
| 响应式布局优化 | Sidebar → Bottom Nav，编辑器适配触屏 | 高 |
| 离线缓存 | Service Worker 缓存最近访问的文件，离线可读 | 中 |

---

## P3 — AI 增强（在 P1/P2 基础上）

| 项 | 说明 | 优先级 |
|---|------|--------|
| **ACP (Agent Communication Protocol)** | 连接外部 Agent，知识库成为多 Agent 协作中枢 | 高 |
| **深度 RAG 集成** | 语义搜索 + 本地向量数据库（LanceDB） | 高 |
| **主动式后台 Agent** | 自动检测笔记，提示结构化建议或维护引用图谱 | 中 |
| **Agent Inspector 增强** | 操作日志渲染为可筛选时间线 | 中 |

## P4 — 长期探索

| 项 | 说明 |
|---|------|
| **评论/批注机制** | Agent 在文件旁添加批注，支持人机异步协作 |
| **心智时光机** | 可视化知识演变过程 |
| **动态技能协议** | Markdown 中定义自动化脚本，笔记即工具 |
| **跨 Agent 协同网格** | 冲突解决协议，多厂商 Agent 围绕同一 MindOS 协作 |
| **分享模板** | 导出和导入社区模板 |
| **团队版** | 多人共享知识库 + 权限管理 |

---

## 架构演进路线

```
v0.1 (初始)                  v0.2 (P1 ✅)                  v0.3 (P2)
┌──────────┐               ┌──────────┐               ┌──────────┐
│ CLI-only │               │ CLI +    │               │ CLI +    │
│ 手动启动  │    ──────▶    │ 自启 daemon│    ──────▶    │ 桌面安装包│
│ 本地存储  │               │ Git 自动同步│               │ Cloud Hub│
└──────────┘               └──────────┘               └──────────┘

用户画像:                   用户画像:                   用户画像:
开发者 only                 开发者 + 熟悉终端的人         所有人
```

**关键原则：**
- 每个阶段都独立可用，不依赖后续阶段
- "数据本地存储"始终是默认选项，云端是 opt-in
- 优先覆盖高频场景（开发者 → 技术用户 → 普通用户）

---
*Last Updated: 2026-03-14*
