<!-- Created: 2026-03-30 | Status: Research -->

# ACP / A2A 协议调研与 MindOS 集成方案

## 1. 行业全景

### 协议层

| 协议 | 组织 | 层级 | 状态 | 定位 |
|------|------|------|------|------|
| **A2A v1.0** | Linux Foundation (原 Google) | Agent ↔ Agent | Stable (2026-03) | Agent 间对话、任务委派、发现 |
| **MCP** | Anthropic | Agent ↔ Tools | Stable | Agent 调用工具和资源 |
| ~~ACP~~ | ~~IBM~~ | — | 已合并入 A2A (2025-08) | — |

### 框架层

| 框架 | 组织 | 特点 |
|------|------|------|
| **Agents SDK** | OpenAI | 进程内编排，handoff 模式，agent-as-tool |
| **MAF (AutoGen + Semantic Kernel)** | Microsoft | A2A + MCP 原生支持，GA 2026-03 |
| **LangGraph** | LangChain | 图状态机，checkpoint + 恢复 |
| **CrewAI** | 开源 | 角色扮演，任务编排 |
| **Swarm** | OpenAI (实验) | 极简 handoff + routine |

### 核心结论

**行业正在收敛到：MCP（工具层）+ A2A（Agent 层）的双协议栈。**

```
Agent A ──A2A──> Agent B ──A2A──> Agent C
  │                │                │
  MCP              MCP              MCP
  │                │                │
  ▼                ▼                ▼
Tools/APIs       Tools/APIs       Tools/APIs
```

---

## 2. A2A 协议核心机制

### 2.1 Agent 发现

```
GET https://{domain}/.well-known/agent-card.json
```

返回 Agent Card JSON：
- 名称、描述、版本、提供者
- 支持的接口（JSON-RPC / gRPC / HTTP+JSON）
- 能力声明（streaming、pushNotifications）
- 技能列表（name、description、inputModes、outputModes）
- 认证方案（Bearer、OAuth2、API Key、mTLS、OIDC）

### 2.2 Task 生命周期

```
SUBMITTED → WORKING → COMPLETED (成功)
                    → FAILED (失败)
                    → CANCELED (取消)
                    → REJECTED (拒绝)
                    → INPUT_REQUIRED → WORKING (需要更多输入)
                    → AUTH_REQUIRED → WORKING (需要授权)
```

### 2.3 通信模式

| 模式 | 描述 | 适用场景 |
|------|------|----------|
| 阻塞 | 发消息，等结果 | 简单查询 |
| 非阻塞 | 发消息，返回 taskId，轮询 | 长任务 |
| 流式 | SSE 实时推送状态和结果 | 实时交互 |
| Webhook | 注册回调 URL，服务端推送 | 移动端、无服务器 |

### 2.4 SDK

```bash
npm install @a2a-js/sdk   # JavaScript
pip install a2a-sdk        # Python
```

---

## 3. A2A vs MCP 对比

| 维度 | A2A | MCP |
|------|-----|-----|
| 连接对象 | Agent ↔ Agent | Agent ↔ Tools |
| 通信模型 | 多轮对话，有状态 | 请求-响应，通常无状态 |
| 任务管理 | 完整生命周期（8 个状态） | 无——调用即结果 |
| 发现机制 | Agent Card (`/.well-known/`) | Server manifest |
| 内容模型 | Parts（文本/二进制/URL/结构化）+ Artifacts | JSON Schema 输入输出 |
| 协商能力 | 可拒绝、可要求输入、可要求授权 | 执行或失败 |
| 认证 | 5 种方案 | 传输层 |

**关系：互补，不竞争。MCP 是工具车间，A2A 是会议室。**

---

## 4. MindOS 集成方案

### 4.1 当前架构

```
MindOS App (Next.js)
  ├── 内置 Agent（pi-agent-core）
  ├── MCP Server（工具层，21 个工具）
  └── 外部 Agent 通过 MCP 连接
        ├── Claude Code
        ├── Cursor
        ├── Codex
        └── ...
```

**现状问题：** 外部 Agent 只能单向调用 MindOS 工具（MCP），无法：
- 让 MindOS Agent 调度外部 Agent 执行任务
- 让外部 Agent 之间协作
- 感知其他 Agent 的能力和状态

### 4.2 目标架构

```
┌──────────────────────────────────────────────────────────┐
│                    MindOS Hub                             │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              A2A Gateway                             │ │
│  │  /.well-known/agent-card.json                       │ │
│  │  POST /a2a/v1 (JSON-RPC)                           │ │
│  │  GET  /a2a/v1/stream (SSE)                         │ │
│  └──────────────┬──────────────────────────────────────┘ │
│                 │                                         │
│  ┌──────────────┼──────────────────────────────────────┐ │
│  │         Task Router / Orchestrator                   │ │
│  │  - 接收 A2A 任务                                     │ │
│  │  - 根据 skill 匹配分派给最佳 Agent                    │ │
│  │  - 管理任务生命周期                                   │ │
│  │  - 聚合结果返回                                       │ │
│  └──────┬────────┬────────┬────────┬───────────────────┘ │
│         │        │        │        │                      │
│    ┌────┴──┐ ┌───┴──┐ ┌───┴──┐ ┌───┴──┐                 │
│    │MindOS │ │Claude│ │Cursor│ │Codex │  ...             │
│    │Agent  │ │Code  │ │      │ │      │                  │
│    │(内置) │ │(外部)│ │(外部)│ │(外部)│                  │
│    └───┬───┘ └───┬──┘ └───┬──┘ └───┬──┘                 │
│        MCP       MCP      MCP      MCP                   │
│        │         │        │        │                      │
│        └─────────┴────────┴────────┘                      │
│                      │                                    │
│              ┌───────┴────────┐                           │
│              │  Knowledge Base │                          │
│              │  (my-mind/)     │                          │
│              └────────────────┘                           │
└──────────────────────────────────────────────────────────┘
```

### 4.3 分阶段实施

#### Phase 1：MindOS 作为 A2A Server（被调度方）

**目标：** 让外部 Agent 通过 A2A 协议调用 MindOS 的知识库能力。

**实现：**

1. **Agent Card** — 发布 MindOS 能力：
```json
{
  "name": "MindOS Knowledge Base",
  "description": "Personal knowledge management with Spaces, Instructions, and Skills",
  "skills": [
    { "id": "kb-search", "name": "Search Knowledge", "description": "Search notes by keyword" },
    { "id": "kb-read", "name": "Read Note", "description": "Read specific file content" },
    { "id": "kb-write", "name": "Write Note", "description": "Create or update notes" },
    { "id": "kb-organize", "name": "Organize Files", "description": "AI-powered file organization" }
  ],
  "capabilities": { "streaming": true, "pushNotifications": false },
  "securitySchemes": { "bearer": { "httpAuthSecurityScheme": { "scheme": "Bearer" } } }
}
```

2. **A2A 端点** — 新增 `/api/a2a` 路由：
   - 接收 `SendMessage` JSON-RPC 请求
   - 将 A2A Task 转换为内部 Agent 调用
   - 返回 Task 状态和结果

3. **复用现有 MCP 工具**：A2A 请求 → Task Router → 调用 MCP 工具 → 返回结果

**改动范围：**
- 新增 `app/app/api/a2a/route.ts`（A2A JSON-RPC 端点）
- 新增 `app/lib/a2a/`（Agent Card 生成、Task 管理、消息转换）
- 修改 `app/app/.well-known/agent-card.json/route.ts`（Agent Card 发现）

#### Phase 2：MindOS 作为 A2A Client（调度方）

**目标：** MindOS 内置 Agent 可以发现并调用外部 A2A Agent。

**实现：**

1. **Agent 发现** — 扫描已连接 Agent 的 A2A 端点：
   - 尝试 `GET {agent_url}/.well-known/agent-card.json`
   - 解析技能列表，缓存到内存

2. **任务委派** — 内置 Agent 新增工具：
   - `delegate_to_agent(agentId, message)` — 发送任务给指定 Agent
   - `list_available_agents()` — 列出可用 Agent 及其技能
   - `check_task_status(taskId)` — 查询任务状态

3. **UI 展示** — Agents Panel 增加：
   - A2A 能力标识
   - 任务委派历史
   - 实时任务状态

**改动范围：**
- 新增 `app/lib/a2a/client.ts`（A2A Client，发现 + 调用）
- 修改 `app/lib/agent/tools.ts`（新增 delegate/discover 工具）
- 修改 `app/components/agents/`（UI 展示 A2A 状态）

#### Phase 3：多 Agent 编排（Orchestration）

**目标：** 复杂任务自动分解，多 Agent 并行/串行协作。

**实现：**

1. **Task Decomposer** — LLM 分析用户请求，拆解为子任务
2. **Skill Matcher** — 根据 Agent Card 技能匹配最优 Agent
3. **Execution Engine** — 管理并行/串行执行、超时、重试
4. **Result Aggregator** — 汇总多 Agent 结果

---

## 5. 技术选型建议

| 层面 | 选择 | 理由 |
|------|------|------|
| 协议 | A2A v1.0 | 行业标准，Linux Foundation 背书，JS SDK 可用 |
| SDK | `@a2a-js/sdk` | 官方 JS 实现，TypeScript 类型完整 |
| 传输 | JSON-RPC over HTTP | 与现有 Next.js API Routes 架构一致 |
| 认证 | Bearer Token（复用现有） | 与 MCP 认证方案保持一致 |
| 发现 | Well-known URI | 标准机制，零配置 |

### 与现有 MCP 的关系

```
外部 Agent
  │
  ├── MCP (工具调用) ──→ MindOS MCP Server ──→ 知识库操作
  │                        ↑ 已有，保持不变
  │
  └── A2A (任务委派) ──→ MindOS A2A Gateway ──→ 内置 Agent ──→ MCP 工具
                           ↑ 新增
```

**MCP 不替换，A2A 是新增层。两者共存。**

---

## 6. 实施优先级

| 阶段 | 内容 | 依赖 | 复杂度 |
|------|------|------|--------|
| **P1** | Agent Card + /.well-known/ | 无 | 低 |
| **P1** | A2A Server 端点 | Agent Card | 中 |
| **P2** | A2A Client（发现外部 Agent） | P1 | 中 |
| **P2** | delegate_to_agent 工具 | A2A Client | 中 |
| **P3** | 多 Agent 编排引擎 | P2 | 高 |
| **P3** | UI：任务委派面板 | P2 | 中 |

**建议从 P1 开始：先让 MindOS 能被其他 Agent 发现和调用。**

---

## 7. 竞品参考

| 产品 | A2A 支持 | 实现方式 |
|------|----------|----------|
| Google ADK | 原生 | A2A v1.0 完整实现 |
| Microsoft MAF | 原生 | AutoGen + A2A + MCP |
| LangChain | 适配器 | LangGraph + A2A bridge |
| CrewAI | 无 | 自有编排协议 |
| OpenAI Agents SDK | 无 | 进程内 handoff，无网络协议 |

**MindOS 如果率先在个人知识管理领域支持 A2A，将成为差异化优势。**

---

## 8. 风险与注意事项

1. **A2A 协议刚发布 v1.0** — 可能有 breaking changes，但 Linux Foundation 背书降低风险
2. **JS SDK 成熟度** — 需要评估 `@a2a-js/sdk` 的生产就绪度
3. **安全边界** — A2A 开放了更多攻击面，需要严格的认证和授权
4. **性能** — 多 Agent 编排的延迟叠加，需要超时和降级策略
5. **用户体验** — 多 Agent 协作的进度展示需要精心设计

---

## See Also

- [A2A Protocol Spec](https://a2a-protocol.org/latest/specification/)
- [A2A GitHub](https://github.com/a2aproject/A2A)
- [A2A JS SDK](https://github.com/a2aproject/a2a-js)
- [wiki/25-agent-architecture.md](./25-agent-architecture.md)
