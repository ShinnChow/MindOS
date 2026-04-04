# 专业度审计 — 第二轮发现

> 2026-04-02 深度审计。第一轮 10 项 + P0 2 项已全部修复。
> 本文件记录剩余待办。P1 经逐项验证后全部降级或移除。

## P0 阻塞级 — 已清零

- [x] `_standalone/` prepack 安全性 — prepack 开头加 `rm -rf _standalone`
- [x] `pi-coding-agent` 依赖 — 误报，是核心运行时依赖，已更新 wiki

## ~~P1~~ — 经验证全部降级或移除

- [x] ~~Open Graph 标签~~ — **误报，已移除**。MindOS 是本地应用（localhost），OG 标签无意义
- [ ] `createFile()` TOCTOU — **降为 P2**。概率极低，后果有限
- [ ] SearchPanel ARIA role — **降为 P3**。键盘导航已实现，目标用户群屏幕阅读器使用率极低

## P2 中等

- [ ] **`createFile()` TOCTOU 竞态**（从 P1 降级）— `existsSync` → `writeFileSync` 之间有竞态窗口。修复：`fs.writeFileSync(path, content, { flag: 'wx' })`
  - 文件：`app/lib/core/fs-ops.ts:39-46`

- [ ] **muted-foreground 对比度不足** — light 模式 `#685f52` on `#f8f6f1` = 3.7:1，未达 WCAG AA 4.5:1。需加深色值
  - 文件：`app/app/globals.css:70`
  - 注：`--amber-text` 已单独加深过，此项是 muted-foreground 通用辅助文字色

- [ ] **config.json 损坏时静默忽略** — `bin/lib/config.js:13` 空 catch 吞掉 JSON 解析错误。应 warn 用户
  - 文件：`bin/lib/config.js:12-14`

- [ ] **`extend` 包** — **经查不是问题**。虽然 app 源码无直接 import，但它是 `gaxios`（Google API）和 `unified`（markdown）的间接依赖，被提升到 package.json 是正常的 npm hoisting 行为。~~移除~~保留
  - 验证结果：`gaxios/build/*/src/gaxios.js` 和 `unified/lib/index.js` 依赖它

- [ ] **mcp/package.json `tsx` 应为 devDependency** — 仅 `npm run dev` 使用，生产用 `dist/index.cjs`
  - 文件：`mcp/package.json:13`

- [ ] **FileTree 缺 ARIA tree role** — 缺 `role="tree"` / `role="treeitem"` / `aria-expanded`
  - 文件：`app/components/FileTree.tsx`（仅有一个 aria-label 在 toggle 按钮上）

## P3 低优先

- [x] ~~robots.txt / sitemap.xml~~ — **不需要**。MindOS 是本地应用，不需要 SEO。Landing page 是独立站点
- [ ] **Settings 多标签页竞态** — 两标签页同时写 settings，后写覆盖先写。低频
- [ ] **MCP 缺分页** — `mindos_list_files` 大知识库 payload 过大
- [ ] **appendFileSync 无锁** — 多 Agent 并发 append 可能交错（罕见）
- [ ] **SearchPanel 缺 ARIA listbox**（从 P1 降级）— 键盘导航已有，缺 role 属性

## 已修复（共 12 项）

> 第一轮 10 项 + P0 2 项

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
- [x] prepack 开头 rm -rf _standalone
- [x] wiki pi-coding-agent 决策更新
