# MindOS Progressive Disclosure 分层设计

*创建时间：2026-04-01*

---

## 现状问题

用户第一次打开 MindOS，Activity Bar 有 **8 个图标**，内容区有 **9 个渲染器**，需要理解 **6+ 个概念**。和 Obsidian 首次打开只有一个编辑器相比，认知负荷太重。

```
当前 Activity Bar（全部平等展示）：
  📁 Files     📡 Echo     🔍 Search     🤖 Agents
  ⚡ Flows     🧭 Discover  ❓ Help       ⚙️ Settings
  🔄 Sync
```

---

## 分层原则

| 原则 | 具体做法 |
|------|---------|
| **每层只解决一个问题** | Layer 0 = 写笔记。Layer 1 = 连 Agent。Layer 2 = 深度使用。 |
| **上一层用舒服了才暴露下一层** | 不是时间触发，是行为触发 |
| **藏不是删** | 功能都在，入口按需出现 |
| **零概念上手** | 前 5 分钟不需要知道 Space / Instruction / Skill |

---

## Layer 0：写笔记，AI 能读（首次打开）

> 目标用户感受："哦，就是一个好看的 Markdown 编辑器，还能和 AI 聊。"

### Activity Bar 只展示 3 个

```
📁 Files      — 文件列表
🔍 Search     — 搜索（⌘K）
⚙️ Settings   — 设置
```

### 可见功能

| 功能 | 说明 | 为什么在 Layer 0 |
|------|------|----------------|
| 文件浏览器 | 树形目录 | 最基本的操作 |
| Markdown 编辑器 | 写和读 | 核心价值 |
| 搜索 | ⌘K 全局搜索 | 高频操作 |
| AI Chat | ⌘/ 打开 | "和笔记聊天"是直觉性的 |
| 设置 | 基础配置 | 必须有 |

### 隐藏功能

Echo、Agents、Flows、Discover、Sync、Changes、Agent Inspector、Wiki Graph、Timeline、CSV——全部隐藏。

### 需要理解的概念：0 个

不说 Space（就叫"文件夹"），不说 Instruction，不说 Skill。就是"写 Markdown，AI 能读"。

### 渲染器

只默认启用 **3 个最常用的**：

| 渲染器 | 保留 | 理由 |
|--------|------|------|
| summary | ✅ | 文件摘要，基础功能 |
| backlinks | ✅ | 反向链接，轻量有用 |
| todo | ✅ | TODO 看板，高频使用 |
| config | 藏 | 高级配置 |
| csv | 藏 | 特定场景 |
| graph | 藏 | 酷但非必须 |
| timeline | 藏 | 低频 |
| workflow-yaml | 藏 | Layer 2 |
| agent-inspector | 藏 | Layer 2 |

---

## Layer 1：连 Agent，让 AI 更懂你（使用 3-7 天后）

> 目标用户感受："原来 Cursor/Claude Code 能直接读我的笔记！"

### 触发条件（满足任一即展示）

- 创建了 5+ 个文件
- 使用了 3+ 天
- 主动搜索 "agent" / "MCP" / "连接"
- 点击了新手引导中的"连接 Agent"步骤

### 新增 Activity Bar

```
📁 Files      — 文件列表
🔍 Search     — 搜索
🤖 Agents     — NEW：Agent 管理
📥 Import     — NEW：一键导入（如果未用过）
⚙️ Settings
```

### 新增可见功能

| 功能 | 说明 | 为什么在 Layer 1 |
|------|------|----------------|
| Agent 管理面板 | MCP 连接状态 + Agent 列表 | 核心：让 Agent 读到你 |
| 一键导入 | 批量导入已有文档 | 加速知识库填充 |
| Instruction 概念 | "写一次规则，所有 AI 遵守" | 自然引出 |
| Skill 概念 | "把纠正变成可复用规则" | 沉淀的起点 |
| MCP 安装引导 | 一键安装到 Cursor/Claude Code | 连接的关键步骤 |

### 新增渲染器

| 渲染器 | 说明 |
|--------|------|
| graph | Wiki Graph — 看到知识间的关系 |

### 需要理解的概念：3 个

| 概念 | 一句话解释 |
|------|-----------|
| Instruction | 写一次规则，所有 AI 遵守 |
| Skill | 你的经验变成 AI 可执行的手册 |
| MCP | 让 AI 工具读到你的笔记的协议（用户不需要理解细节） |

---

## Layer 2：深度使用，人机共演化（使用 2-4 周后）

> 目标用户感受："MindOS 比我想的深得多。"

### 触发条件（满足任一即展示）

- 连接了 2+ 个 Agent
- 创建了 20+ 个文件
- 创建了第一个 Skill
- 主动搜索 "echo" / "workflow" / "inspector" / "变更"
- 在设置中手动开启高级功能

### 新增 Activity Bar

```
📁 Files
📡 Echo       — NEW：回响/反思
🔍 Search
🤖 Agents
⚡ Flows      — NEW：Workflow 编排
🧭 Discover   — NEW：发现社区 Skill
⚙️ Settings
🔄 Sync       — NEW：同步状态
```

### 新增可见功能

| 功能 | 说明 | 为什么在 Layer 2 |
|------|------|----------------|
| Echo 回响 | 5 种反思类型 | "人变强"的入口 |
| Workflow 编排 | YAML 多步工作流 | 高级用户需求 |
| Discover | 社区 Skill 浏览 | 生态探索 |
| Changes 变更追踪 | Agent 改了什么一目了然 | 治理需求 |
| Agent Inspector | 工具调用时间线 | 审计需求 |
| ACP/A2A 面板 | Agent 间通信 | 多 Agent 编排 |
| Git 同步 | 跨设备同步 | 数据安全 |

### 新增渲染器

全部解锁：csv、timeline、workflow-yaml、agent-inspector、config。

### 新增概念

| 概念 | 一句话解释 |
|------|-----------|
| Space | 按项目/思维方式分区知识 |
| Echo | AI 帮你反思自己的思维模式 |
| ACP/A2A | Agent 之间互相对话和委派任务 |
| Workflow | 多步骤执行流程的 YAML 定义 |

---

## 实现方案

### 方案 A：基于 Feature Flag（推荐）

```typescript
// lib/progressive-disclosure.ts

type Layer = 0 | 1 | 2;

interface DisclosureState {
  layer: Layer;
  unlockedFeatures: Set<string>;
}

// 触发条件检测
function computeLayer(stats: UserStats): Layer {
  if (stats.connectedAgents >= 2 || stats.fileCount >= 20 || stats.hasSkill) return 2;
  if (stats.fileCount >= 5 || stats.daysActive >= 3) return 1;
  return 0;
}
```

### 方案 B：Settings 手动切换

在 Settings 中加一个"界面模式"开关：

```
界面模式：
  ○ 简洁（推荐新手）     — Layer 0
  ○ 标准                 — Layer 1
  ● 完整                 — Layer 2
```

### 方案 C：A + B 结合（最终推荐）

自动检测层级 + 允许用户手动覆盖。默认从 Layer 0 开始，满足条件自动升级，用户随时可在 Settings 切换。

---

## Activity Bar 对比

```
Layer 0（新手）          Layer 1（连接）          Layer 2（深度）
─────────────          ─────────────          ─────────────
📁 Files               📁 Files               📁 Files
🔍 Search              🔍 Search              📡 Echo
                       🤖 Agents              🔍 Search
                                              🤖 Agents
                                              ⚡ Flows
                                              🧭 Discover
─────────────          ─────────────          ─────────────
⚙️ Settings            ⚙️ Settings            ⚙️ Settings
                                              🔄 Sync
─────────────          ─────────────          ─────────────
共 3 个                 共 4 个                 共 8 个
```

---

## 概念暴露对比

| 概念 | Layer 0 | Layer 1 | Layer 2 |
|------|---------|---------|---------|
| Markdown 文件 | ✅ | ✅ | ✅ |
| 搜索 | ✅ | ✅ | ✅ |
| AI Chat | ✅ | ✅ | ✅ |
| Instruction | — | ✅ | ✅ |
| Skill | — | ✅ | ✅ |
| MCP | — | ✅（一键安装） | ✅ |
| Space | — | — | ✅ |
| Echo | — | — | ✅ |
| Workflow | — | — | ✅ |
| ACP/A2A | — | — | ✅ |
| Agent Inspector | — | — | ✅ |

**Layer 0 概念数：0。Layer 1：3。Layer 2：全部。**

---

## 对战略文档的影响

这个分层设计回应了 strategy.md 的五层积累模型：

| 积累层次 | 对应 UI Layer | 用户感知 |
|---------|-------------|---------|
| 层次 1：记住 | Layer 0 | "写笔记，AI 能读" |
| 层次 2：结构化 | Layer 1 | "纠正变成了规则" |
| 层次 3-5：反思→方法论→代理 | Layer 2 | "我和 AI 在一起变强" |
