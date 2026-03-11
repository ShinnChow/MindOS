# MindOS 开发日志 — 2026-03-12

## 本次完成的主要改动

---

### 1. MCP HTTP Transport 支持

- `mcp/src/index.ts`：默认传输模式从 `stdio` 改为 `http`（Streamable HTTP）
- 新增 `MCP_TRANSPORT`、`MCP_HOST`、`MCP_PORT`、`MCP_ENDPOINT` 配置项
- `mindos mcp` 默认启动 HTTP 服务（端口 8787），无需额外参数
- stdio 模式需显式设置：`MCP_TRANSPORT=stdio mindos mcp`

---

### 2. MCP Server 随 App 自动启动

- `bin/cli.js`：新增 `spawnMcp()` 函数，用 `spawn` 以子进程方式启动 MCP server
- `mindos start` 和 `mindos dev` 现在会同时启动 App + MCP server
- `mindos mcp` 保留，用于单独启动 MCP server

---

### 3. MCP 端口配置化

- `scripts/setup.js`：新增 `mcpPort` 写入 `~/.mindos/config.json`，默认 8787
- `bin/cli.js`：`loadConfig()` 读取 `config.mcpPort` → `MINDOS_MCP_PORT` → `MCP_PORT`
- `app/lib/settings.ts`：`ServerSettings` 新增 `mcpPort?` 字段

---

### 4. AI Provider 多配置支持

**新的 `~/.mindos/config.json` 结构：**

```json
{
  "ai": {
    "provider": "anthropic",
    "providers": {
      "anthropic": { "apiKey": "sk-ant-...", "model": "claude-sonnet-4-6" },
      "openai":    { "apiKey": "sk-...", "model": "gpt-5.4", "baseUrl": "" }
    }
  }
}
```

- 多个 provider 可同时配置，切换只需改 `ai.provider`，无需重新填 API Key
- `baseUrl` 只有 `openai` 有，`anthropic` 不需要
- 旧的 flat format 自动 migrate（`migrateAi()` 函数）

**涉及文件：**
- `app/lib/settings.ts`：新类型 `ProviderConfig` / `AiConfig`，`migrateAi()` 兼容旧格式
- `app/components/settings/types.ts`：`AiSettings` 对应新结构
- `app/app/api/settings/route.ts`：GET/POST 适配新结构，分 provider mask key
- `app/components/settings/AiTab.tsx`：`patchProvider()` 只更新当前 provider
- `app/components/SettingsModal.tsx`：`restoreFromEnv` 用新结构
- `scripts/setup.js`：写入新结构，保留另一个 provider 的已有配置
- `bin/cli.js`：`loadConfig()` 支持新/旧两种格式读取 key
- `app/__tests__/setup.ts`：mock 更新为新 `providers` dict 格式

---

### 5. Setup 流程优化（`mindos onboard`）

- 去掉 `Web port` 和 `MCP port` 问题（默认 3000/8787，不让用户配）
- 去掉 `Startup mode` 问题（默认 `start`，普通用户不需要选）
- `Auth token` 问题移到 AI 配置之前
- `finish()` 输出的 MCP 配置自动带上 `Authorization` header（如果设了 token）

---

### 6. 默认模型更新

- OpenAI 默认模型从 `gpt-4o-mini` 全局更新为 `gpt-5.4`
- 涉及：`README.md`、`README_zh.md`、`scripts/setup.js`、`app/lib/settings.ts`、`app/components/settings/AiTab.tsx`、`app/README.md`、`.env.local.example`、`app/__tests__/setup.ts`

---

### 7. README 中英文更新

**MCP 配置章节重构：**
- 方式 A：本机（stdio 在前 + URL 备选）
- 方式 B：远程 URL（跨设备）
- 说明 MCP 随 `mindos start/dev` 自动启动，无需额外命令
- MCP 端口默认 8787，可通过 `mindos onboard` 修改

**Config Reference 更新：**
- 展示完整 JSON 结构示例
- 字段名更新为 `ai.providers.anthropic.*` / `ai.providers.openai.*`
- 加入 `mcpPort` 字段说明
- 去掉 `startMode` 字段

**Setup 步骤列表更新：**
- 顺序：知识库路径 → 模板语言 → Auth token → AI Provider + Key
- 去掉 port 和 startup mode

**其他：**
- 首次安装改为 `npm install -g mindos@latest`
- Run 章节：`mindos start` 为主，加注"app + MCP 同时启动"
- Common Pitfalls：去掉过时的 `MCP_HOST` 条目

---

### 8. 其他 Bug 修复

- `mcp/README.md`：全面重写，补全环境变量表、更新集成示例
- `mcp/src/index.ts` header 注释：stdio/HTTP 顺序对调，HTTP 标为默认
- `scripts/setup.js`：删除未使用的冗余变量 `const startMode`

---

---

### 9. Web UI 登录密码保护

**新字段 `webPassword`（独立于 `authToken`）：**

- `authToken` = 保护 `/api/*` 和 MCP，供 Agent / MCP 客户端使用（Bearer token）
- `webPassword` = 保护浏览器 UI，设置后访问 `localhost:3000` 需先登录
- 两者完全独立，可只设其中一个，也可都设

**实现方式：**
- `app/middleware.ts`：扩展 matcher 覆盖页面路由，`WEB_PASSWORD` 未设则跳过，设了则检查 `mindos-session` cookie
- Cookie 值为 `SHA-256(WEB_PASSWORD)`，用 `crypto.subtle`（Edge runtime 兼容），有效期 7 天
- `app/app/api/auth/route.ts`：POST 验证密码并 Set-Cookie，DELETE 清除（logout）
- `app/app/login/page.tsx`：风格与 MindOS 一致的登录页（amber 按钮、IBM Plex Mono 标题）
- `app/app/layout.tsx`：通过 middleware 注入的 `x-pathname` header 检测 `/login`，跳过 `SidebarLayout`
- `middleware` 变为 `async` 后，测试需要 `await middleware(...)`

**`scripts/setup.js` 新增 `webPassPrompt` 问题，写入 config。**

---

### 10. 本地开发 `mindos` 命令注册

- clone 源码后 `npm install` 不会自动注册全局命令
- 需要在项目根目录执行 `npm link` 才能使用 `mindos` 命令
- README Option B 已补充此步骤

---

### 11. 用户升级指引

- 老版本：clone 仓库 → 分别 `npm install` → `app/.env.local` 配置 → `cd app && npm run dev`
- 新版本：`npm install -g mindos@latest` → `~/.mindos/config.json` → `mindos start`
- 升级 Prompt 放在 `scripts/upgrade-prompt.md`，引导 Agent 自动完成：读取旧 `.env.local` → 转换格式写入新 config → 启动验证

---

## 关键设计决策

| 决策 | 原因 |
|------|------|
| MCP HTTP 为默认模式 | 更通用，本机和远程都能用，且随 app 自动启动 |
| MCP 随 app 自动启动 | 用户只需一个命令，降低使用门槛 |
| 多 provider 字典结构 | 切换 provider 不用重新填 key，体验更好 |
| 去掉 setup 中的 port/startup mode 问题 | 普通用户不需要关心这些细节，减少摩擦 |
| `baseUrl` 只有 openai 有 | Anthropic 官方无自定义 endpoint 需求 |
| `webPassword` 与 `authToken` 分离 | 两种访问场景（浏览器用户 vs Agent）需求不同，不应共用同一凭据 |
| Cookie 值用 SHA-256 而非明文 | 不把原始密码存入 cookie，且无需数据库，重启后仍有效 |
| middleware 变为 async | Edge runtime 中 `crypto.subtle.digest` 是 async API，必须 await |
| AI 不可用只提示不做连通性检测 | Anthropic/OpenAI 无免费 ping 接口，验证必须消耗 token，提示足够 |
| `AiConfig.providers` 字段改为必填 | `migrateAi()` 保证输出完整，消费方无需 `??` / cast，类型与运行时一致 |

---

## 第二阶段改动（2026-03-12 下午）

### 12. sessions.json 迁移到 ~/.mindos

- `app/app/api/ask-sessions/route.ts`：`STORE_PATH` 从 `app/data/ask-sessions.json` 改为 `~/.mindos/sessions.json`
- 好处：用户数据统一在 `~/.mindos/`，不混入项目目录，npm 包升级不影响历史会话

---

### 13. Next.js 16 middleware → proxy 重命名

- Next.js 16 废弃 `middleware.ts`，改用 `proxy.ts`，导出函数名从 `middleware` 改为 `proxy`
- `app/middleware.ts` → `app/proxy.ts`，`export async function middleware` → `export async function proxy`
- 测试文件 import 改为 `import { proxy as middleware } from '@/proxy'`（别名保持测试内部命名不变）

---

### 14. TypeScript 严格类型修复

**根本原因：** `AiConfig.providers` 里 `anthropic?` / `openai?` 是可选字段，fallback `?? {}` 导致类型为 `ProviderConfig | {}`，访问字段时 TS 报错。

**修法：** 把 `providers.anthropic` / `.openai` 改为必填，在 `migrateAi()` 里用 `parseProvider()` helper 做严格防御——逐字段校验类型，非法值（null、数字、空字符串）用 DEFAULTS 填充。消费方直接访问，无需任何 cast。

```typescript
function parseProvider(raw: unknown, defaults: ProviderConfig): ProviderConfig {
  return {
    apiKey: str(raw, 'apiKey', defaults.apiKey),
    model:  str(raw, 'model',  defaults.model),
    ...
  };
}
```

---

### 15. AI API Key 未配置提示

- `AiTab.tsx`：检测当前 provider 的 apiKey 为空且无 env override 时，底部显示红色警告
- `i18n.ts`：新增 `noApiKey` 中英文文案
- 不做连通性测试（需消耗 token），静态提示足够
