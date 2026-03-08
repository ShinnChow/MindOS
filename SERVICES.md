# 🛠️ MindOS 技术服务总览

本文件记录 MindOS 项目的所有技术服务：前端 App、MCP Server、Agent Skills 及外部 MCP 集成。

---

## 🖥️ 前端 App — MindOS

**路径**: `app/`
**访问**: `http://localhost:3000`
**定位**: 个人知识库的浏览器界面，本地运行，无数据库，无云同步，直接读写文件系统。

### 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 15 App Router |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| 编辑器 | CodeMirror 6 |
| Markdown | react-markdown + GFM |
| AI 接入 | Vercel AI SDK (`@ai-sdk/anthropic`, `@ai-sdk/openai`) |
| 搜索 | Fuse.js（模糊搜索） |
| CSV | PapaParse |

### 核心功能

| 功能 | 快捷键 | 说明 |
|------|--------|------|
| 文件浏览器 | — | 侧栏文件树，支持目录折叠、网格/列表视图 |
| Markdown 渲染 | — | GFM 表格、代码高亮、复制按钮 |
| CSV 查看器 | — | 可排序表格，粘性表头 |
| 内联编辑 | `E` 进入 / `⌘S` 保存 / `Esc` 退出 | CodeMirror 6 编辑器 |
| 全文搜索 | `⌘K` | 模糊搜索 + snippet 预览 |
| 目录导航 | — | 浮动 TOC 面板，可折叠 |
| AI 问答 | `⌘/` | 流式 LLM，`@` 附件文件 |
| 暗/亮模式 | — | 跟随系统，可手动切换 |
| 文件管理 | — | 创建、重命名、删除 |
| 移动端 | — | 响应式布局，顶部导航栏 + 抽屉侧边栏 |

### 启动与部署

```bash
cd app
npm install
npm run dev        # 开发模式 http://localhost:3000

# 生产部署
npm run build
pm2 start npm --name mindos -- start
```

### 环境变量（`app/.env.local`）

```env
MIND_ROOT=/data/home/geminitwang/code/sop_note
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MIND_ROOT` | `/data/home/geminitwang/code/sop_note` | 知识库根目录 |
| `AI_PROVIDER` | `anthropic` | `anthropic` 或 `openai` |
| `ANTHROPIC_API_KEY` | — | Anthropic 模型必填 |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | 模型 ID |
| `OPENAI_API_KEY` | — | OpenAI 模型必填 |
| `OPENAI_BASE_URL` | — | 自定义代理地址 |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI 模型 ID |

---

## 🔌 MCP Server — MindOS Knowledge Base

**路径**: `mcp/`
**入口**: `mcp/dist/index.js`
**传输**: stdio（本地使用）
**定位**: 将知识库文件系统暴露为 MCP 工具，让 Agent 直接读写、搜索笔记。

### 技术栈

| 层 | 技术 |
|----|------|
| 语言 | TypeScript (ES2022) |
| MCP SDK | `@modelcontextprotocol/sdk ^1.6.1` |
| 校验 | Zod |
| 传输 | stdio |

### 工具列表

| 工具名 | 操作 | 说明 |
|--------|------|------|
| `mindos_list_files` | 读 | 文件树（ASCII 或 JSON），支持深度控制 |
| `mindos_read_file` | 读 | 读取文件内容，支持 offset/limit 分页 |
| `mindos_search_notes` | 读 | 全文搜索，返回 snippet + 相关度评分 |
| `mindos_get_recent` | 读 | 最近修改的文件列表 |
| `mindos_write_file` | 写 | 原子覆写文件（tmp + rename） |
| `mindos_create_file` | 写 | 创建新文件（自动创建父目录） |
| `mindos_delete_file` | 删 | 永久删除文件 |
| `mindos_append_csv` | 写 | RFC 4180 CSV 追加行 |

### 安全机制

- `resolveSafe()` 路径校验，禁止目录穿越（`../` 攻击）
- 只允许访问 `MIND_ROOT` 内的 `.md` 和 `.csv` 文件
- `app/`、`mcp/`、`node_modules/` 等技术目录自动排除

### 注册配置（`~/.claude-internal/.claude.json`）

```json
{
  "mcpServers": {
    "mindos": {
      "type": "stdio",
      "command": "node",
      "args": ["/data/home/geminitwang/code/sop_note/mcp/dist/index.js"],
      "env": {
        "MIND_ROOT": "/data/home/geminitwang/code/sop_note"
      }
    }
  }
}
```

### 构建

```bash
cd mcp
npm install
npm run build      # tsc → dist/
npm run dev        # tsx watch（开发热重载）
```

---

## 🤖 Agent Skills

已安装的全局 Skills，供 Claude Code Internal 等 Agent 调用。详细清单见 `Configurations/Agents/🤖 Agent 常用Skill.md`。

### 本项目常用 Skills

| Skill | 触发场景 |
|-------|----------|
| `mcp-builder` | 开发或扩展 MCP Server 工具 |
| `ui-design-patterns` | 前端 UI 组件设计与实现 |
| `frontend-design` | 高质量前端界面开发 |
| `vercel-react-best-practices` | Next.js 性能优化 |
| `fullstack-review` | 前后端代码质量审查 |
| `ux-review` | UI/UX 质量审计 |

---

## 🌐 外部 MCP 集成

Agent 通过这些外部 MCP 与第三方服务交互。详细配置见 `Configurations/Agents/🤖 Agent 常用MCP.md`。

| MCP | 服务 | 用途 |
|-----|------|------|
| `notion` | Notion | 搜索、读写 Notion 页面与数据库 |
| `dida365` | 滴答清单 | 管理任务与项目（创建/更新/完成/删除） |
| `youtube` | YouTube | 搜索视频、获取字幕与频道信息 |
| `arxiv` | arXiv | 搜索、下载、全文阅读学术论文 |
| `github` | GitHub | 操作 Issues、PR、Actions、仓库 |

---

## 📦 依赖概览

```
sop_note/
├── app/              # Next.js 前端，node_modules 独立
│   └── package.json  # next, react, tailwindcss, codemirror, ai-sdk...
└── mcp/              # MCP Server，node_modules 独立
    └── package.json  # @modelcontextprotocol/sdk, zod
```

两个子项目 `node_modules` 完全独立，互不干扰。
