# 专业度审计 — 第二轮发现

> 2026-04-02 深度审计。第一轮（console.log / npm 元数据 / as any / 输入校验 / CI lint / JSDoc / CONTRIBUTING.md 等 10 项）已全部修复。
> 本文件记录第二轮发现的剩余问题。

## P0 阻塞级

- [x] **`_standalone/` prepack 安全性** — prepack 脚本开头加 `rm -rf _standalone`，确保不会包含本地残留的旧版 standalone 产物
  - 文件：`package.json` prepack 脚本
  - `_standalone/` 必须在 files 字段中（否则 npm pack 不包含），安全性靠 prepack 先清后建保证

- [x] **`@mariozechner/pi-coding-agent` 依赖** — **误报，不是问题**。wiki 讨论过时，实际代码已采用 pi-coding-agent 的 session 引擎（`createAgentSession`、`ModelRegistry`、`AuthStorage` 等 7 个 API），是核心运行时依赖。已更新 wiki 状态为"已部分采用"

## P1 重要

- [ ] **`createFile()` TOCTOU 竞态条件** — `existsSync()` 检查后 `writeFileSync()` 之间，其他进程可能创建同名文件。应使用 `fs.writeFileSync(path, content, { flag: 'wx' })` 原子创建
  - 文件：`app/lib/core/fs-ops.ts:39-46`
  - 风险：并发创建导致数据覆盖

- [ ] **缺少 Open Graph 标签** — layout.tsx 没有 og:title / og:description / og:image / twitter:card，社交分享时无预览
  - 文件：`app/app/layout.tsx`
  - 修复：添加 Next.js Metadata export

- [ ] **搜索结果列表缺 ARIA role** — SearchPanel 搜索结果列表缺 `role="listbox"` 和 `aria-activedescendant`，屏幕阅读器无法正确导航
  - 文件：`app/components/panels/SearchPanel.tsx`

## P2 中等

- [ ] **muted-foreground 对比度不足** — `--muted-foreground: #685f52` on `--background: #f8f6f1` = 3.7:1，未达 WCAG AA 小文字要求（4.5:1）。需加深 muted-foreground 色值
  - 文件：`app/app/globals.css`
  - 影响：低视力用户难以阅读辅助文字

- [ ] **损坏的 config.json 被静默忽略** — `bin/cli.js:232` 的 `try { JSON.parse(...) } catch {}` 静默吞掉解析错误，导致后续莫名其妙的配置缺失。应 warn 用户并建议修复
  - 文件：`bin/cli.js:232`
  - 修复：catch 内加 `console.warn('Config file corrupted, using defaults: ' + CONFIG_PATH)`

- [ ] **`extend` 包未使用** — app/package.json 中 `extend` 依赖无直接 import，疑似残留
  - 验证：`grep -r "require('extend')\|from 'extend'" app/` 确认后移除

- [ ] **FileTree 缺 ARIA tree role** — 文件树导航缺 `role="tree"` / `role="treeitem"` / `aria-expanded`
  - 文件：`app/components/FileTree.tsx`

- [ ] **mcp/package.json `tsx` 应为 devDependency** — 仅 dev 脚本使用，不应出现在生产依赖
  - 文件：`mcp/package.json`

## P3 低优先

- [ ] **缺 robots.txt** — 无 `app/app/robots.ts`，搜索引擎无法获取爬取指引
  - 注意：MindOS 是本地应用，SEO 可能不重要。仅 landing page 需要

- [ ] **缺 sitemap.xml** — 同上，仅 landing page 场景需要

- [ ] **Settings 多标签页竞态** — 两个浏览器标签页同时修改 settings，后写覆盖先写。低频场景
  - 文件：`app/lib/settings.ts:207`
  - 长期方案：settings API 加 etag/versioning

- [ ] **MCP 缺分页（大知识库）** — `mindos_list_files` 返回完整文件树，1000+ 文件时 payload 过大
  - 文件：`mcp/src/index.ts:101-114`

- [ ] **appendFileSync 无锁** — 并发 append 操作可能交错写入
  - 文件：`app/lib/core/lines.ts:58-70`
  - 触发条件：多 Agent 同时写同一文件（罕见）

## 已修复（第一轮）

> 以下 10 项已在 2026-04-02 修复并合入 main

- [x] 清理 11 处 debug console.log（DEV 门控）
- [x] package.json 补齐 homepage + bugs
- [x] CHANGELOG.md symlink
- [x] .env.local.example 端口 3000 → 3456
- [x] as any 治理（ask/route.ts -14、context.ts -12、SyncStatusBar -3）
- [x] API 输入校验（bootstrap 路径遍历、parseInt 安全、export 枚举）
- [x] CI 增加 lint 步骤
- [x] CONTRIBUTING.md
- [x] lib/fs.ts 26 个函数补 JSDoc
- [x] SyncStatusBar i18n 类型修复
