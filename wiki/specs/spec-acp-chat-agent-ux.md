# Spec: ACP Chat Agent Attribution & Sticky Session UX

## 目标
让 Ask 聊天中的 ACP Agent 选择对用户可感知、可持续、可追溯：选中的 Agent 在当前会话内持续生效，每条回复都能看出来自哪个 Agent，发送期间有明确路由反馈。

## 现状分析
当前 ACP 选择器已经存在，但用户很难建立稳定心智模型：

1. **选择是一次性的**：发送后 `resetInputState()` 会清掉 `selectedAcpAgent`，用户需要重复选择。
2. **历史不可追溯**：消息结构没有 agent 归因字段，历史里看不出哪条回复来自哪个 Agent。
3. **发送反馈不足**：用户看不到“正在调用哪个 Agent”，只能看到通用 loading。
4. **会话切换丢语境**：切换会话或新建会话时不会恢复该会话原本的 Agent 选择。

### Why?
这个功能不是“多一个标签”，而是修复一个心智模型断裂：用户已经在做“把任务委派给特定 Agent”的动作，但系统没有把这个动作稳定地反映到会话、消息和发送状态里。

### Simpler?
更简单的做法是只让胶囊不重置。但这仍然不能解决：
- 历史里看不出哪个 Agent 回复了什么
- 切换会话后 agent 语境混乱
- 发送时依然没有明确路由反馈

因此最小可接受方案必须同时覆盖：**会话粘性 + 消息归因 + 发送反馈**。

## 数据流 / 状态流
### 现状数据流
```text
AgentSelectorCapsule
  → selectedAcpAgent (AskContent local state)
  → submit()
  → requestBody.selectedAcpAgent
  → /api/ask ACP route
  → resetInputState()
  → selectedAcpAgent 被清空
```

### 目标数据流
```text
AgentSelectorCapsule
  → selectedAcpAgent (当前会话级状态)
  → useAskSession.updateSessionAgent(agent)
  → submit()
  → user message 写入 agentId/agentName
  → assistant placeholder 写入 agentId/agentName
  → /api/ask 使用 selectedAcpAgent 路由
  → 流式更新时保留 agent 归因
  → persistSession() 持久化 messages + defaultAcpAgent
  → loadSession() 时恢复该会话的 selectedAcpAgent
```

### 状态流
```text
[默认 MindOS]
   ├──用户选择 ACP Agent──→ [会话绑定 ACP Agent]
   │                            ├──发送消息──→ [路由中]
   │                            │                 ├──成功──→ [显示带 agent 归因的回复]
   │                            │                 ├──失败──→ [显示带 agent 归因的错误]
   │                            │                 └──停止──→ [恢复输入 + 保留该 agent]
   │                            ├──切换到历史会话──→ [恢复历史会话的 agent]
   │                            └──清除 agent──→ [默认 MindOS]
   ├──从 A2A/Agents 点击 Use 打开──→ [新会话预选 ACP Agent]
   │                                   └──首条发送后持久化到 session
   └──新建会话──→ [默认 MindOS]
```

## 用户流程
用户目标：把一个问题交给特定 Agent，并且在整个会话里保持这个委派语境，不会在发送后“消失”。

前置条件：
- 用户已打开 Ask 面板/弹窗
- 本地已检测到至少一个 ACP Agent
- 会话已初始化

Step 0: 用户也可能从 Agents / A2A 页点击 `Use` 打开 Ask
  → 系统反馈：新打开的 Ask 会话已经预选对应 ACP Agent
  → 状态变化：空会话在内存中保存 `defaultAcpAgent`，直到首条消息发送后再持久化

Step 1: 用户在输入框下方打开 Agent 胶囊并选择 `Claude Code`
  → 系统反馈：胶囊显示 `Claude Code`，不再显示默认 `MindOS Agent`
  → 状态变化：当前活跃会话写入 `defaultAcpAgent={ id, name }`

Step 2: 用户输入消息并发送
  → 系统反馈：消息列表立即出现一条带 `Claude Code` 标签的 assistant 占位消息，并显示“连接中/思考中/生成中”状态
  → 状态变化：user message 和 assistant placeholder 都写入 `agentId/agentName`

Step 3: ACP Agent 开始返回内容
  → 系统反馈：assistant 气泡顶部持续显示 `Claude Code` 标签，正文开始流式渲染
  → 状态变化：流式更新只替换 message content/parts，不覆盖已有 agent 归因

Step 4: 用户切换到另一条历史会话
  → 系统反馈：输入框下方胶囊自动切换成该会话之前绑定的 Agent，若没有则显示默认 MindOS
  → 状态变化：`selectedAcpAgent` 从目标会话恢复

Step 5: 用户回到当前会话继续提问
  → 系统反馈：无需重复选择 Agent
  → 状态变化：新的 user/assistant 消息继续继承该会话的 `defaultAcpAgent`

成功结果：
- 会话级 Agent 选择可持续
- 每条 assistant 回复都有明确 agent 归因
- 发送中用户知道系统正在调用哪个 Agent

异常分支：
- 异常 A：ACP 请求失败
  → 系统如何处理：保留 assistant 占位消息上的 agent 归因，并显示错误内容
  → 用户看到什么：`Claude Code` 标签仍在，错误消息说明失败原因
- 异常 B：用户在流式过程中点击 Stop
  → 系统如何处理：撤回本轮 user/assistant 消息，恢复输入框和附件，同时保留当前会话绑定的 agent
  → 用户看到什么：输入恢复，可直接重发，无需重新选 agent
- 异常 C：切换到没有绑定 agent 的历史会话
  → 系统如何处理：恢复为默认 MindOS
  → 用户看到什么：胶囊显示 `MindOS Agent`

边界场景：
- 空会话：没有消息但用户先选择 agent，再发送第一条消息
- 预选会话：从 `Use` 入口打开的空会话，在首条消息发送前也要保留预选 agent
- 多会话切换：A 会话绑定 Claude，B 会话保持默认，来回切换不能串台
- 中途 Stop：停止后输入恢复时不能丢失当前 agent
- 错误回复：失败时也要保留 agent 标签，避免“到底是谁失败了”不明确
- 旧数据兼容：历史会话/历史消息没有 agent 字段时，UI 仍能正常显示

## UI 状态线框图
### 状态 1：初始 / 默认 Agent
```text
┌─ Ask Composer ────────────────────────────────────────┐
│ [ textarea: 输入问题... ]                      [Send] │
│                                                       │
│ [Agent: MindOS Agent ▼] [Mode] [Provider]             │
└───────────────────────────────────────────────────────┘
```

### 状态 2：已选择 ACP Agent
```text
┌─ Ask Composer ────────────────────────────────────────┐
│ [ textarea: 帮我审查这段代码 ]                 [Send] │
│                                                       │
│ [Agent: Claude Code  ×] [Mode] [Provider]             │
└───────────────────────────────────────────────────────┘
```

### 状态 3：发送中 / 路由反馈
```text
┌─ Messages ────────────────────────────────────────────┐
│                         [User] 帮我审查这段代码       │
│                                                       │
│ [sparkles]  Claude Code                               │
│            ◌ Connecting...                            │
└───────────────────────────────────────────────────────┘
```

### 状态 4：成功回复
```text
┌─ Messages ────────────────────────────────────────────┐
│                         [User] 帮我审查这段代码       │
│                                                       │
│ [sparkles]  Claude Code                               │
│            这里有三个问题：...                        │
└───────────────────────────────────────────────────────┘
```

### 状态 5：错误回复
```text
┌─ Messages ────────────────────────────────────────────┐
│ [sparkles]  Claude Code                               │
│            ✗ ACP Agent Error: connection lost         │
└───────────────────────────────────────────────────────┘
```

## 方案
### 方案 A：只让胶囊不重置
- 用户体验质量：⭐⭐
- 实现复杂度：低
- 可维护性：中
- 风险：只解决“选完就消失”，不解决历史归因和会话切换错乱

### 方案 B：会话级默认 Agent + 消息级归因 + 发送中反馈
- 用户体验质量：⭐⭐⭐⭐⭐
- 实现复杂度：中
- 可维护性：高
- 风险：需要同步 session、message、loading UI 三层状态

### 方案 C：后端注入独立 agent 事件流 + 前端 timeline
- 用户体验质量：⭐⭐⭐⭐
- 实现复杂度：高
- 可维护性：中
- 风险：引入新的 SSE 事件协议，超出当前需求

### 方案对比线框图
```text
方案 A：只保留胶囊                    方案 B：会话+消息归因
┌────────────────────────┐          ┌────────────────────────────┐
│ [Claude Code ×]        │          │ [Claude Code ×]            │
│                        │          │                            │
│ User: 帮我修 bug       │          │ User: 帮我修 bug           │
│ Assistant: ...         │          │ Claude Code                │
│                        │          │ Connecting... / 回复正文   │
└────────────────────────┘          └────────────────────────────┘
UX：只修一半 ⭐⭐                     UX：完整心智闭环 ⭐⭐⭐⭐⭐
```

### 选择
选择 **方案 B**。

理由：这是满足用户真实体验问题的最小完整解。方案 A 虽然更简单，但用户仍然不知道“是谁回复的”和“当前会话现在绑定了谁”；方案 C 价值不足以覆盖新增协议复杂度。

## 影响范围
- 变更文件列表
  - `app/lib/types.ts`
  - `app/hooks/useAskSession.ts`
  - `app/hooks/useAskChat.ts`
  - `app/components/ask/AskContent.tsx`
  - `app/components/ask/MessageList.tsx`
  - `app/components/ask/AskHeader.tsx`（仅在需要时展示会话上下文）
  - `app/hooks/useAskModal.ts` / `app/hooks/useAskPanel.ts`（类型同步）
  - `app/app/api/ask-sessions/route.ts`（类型同步）
  - 相关测试文件
- 受影响的其他模块
  - Ask session 持久化：需要兼容旧 session JSON
  - A2A/ACP 路由逻辑：不改协议，只消费已有 `selectedAcpAgent`
- 是否有破坏性变更
  - 无 API 破坏性变更
  - 持久化 session 新增可选字段，向后兼容

## 边界 case 与风险
1. **旧 session 无 `defaultAcpAgent`**
   - 处理：恢复为默认 MindOS
2. **旧消息无 `agentId/agentName`**
   - 处理：消息 UI 不显示 attribution badge
3. **空会话尚未持久化就切换视图**
   - 处理：agent 选择至少要在内存级 session 中保存，不能只存在 AskContent 局部 state
4. **Stop 后输入恢复**
   - 处理：从 pending user message 恢复 agent 信息，不能只恢复文本
5. **切换 session 时本地输入未发送**
   - 处理：沿用现有清空输入逻辑，但要正确恢复目标 session 的 agent
6. **error message 无正文**
   - 处理：错误气泡也继承 agent 归因，避免来源丢失

已知风险与 mitigation：
- 风险：在 `AskContent.tsx` 误覆盖现有未提交改动
  - mitigation：只做最小范围编辑，避免整段重写
- 风险：session 持久化与 UI 状态不同步
  - mitigation：统一通过 `useAskSession` 提供会话 agent 更新与读取入口
- 风险：消息流更新时覆盖 attribution
  - mitigation：在流式更新回调中合并已有 agent 元数据，而不是直接替换整个 message

## 验收标准
- [ ] 选择 ACP Agent 后发送消息，胶囊不会在发送后自动重置
- [ ] 同一会话连续发送两条消息，第二条无需重新选择 Agent
- [ ] assistant 消息在 loading 和完成后都显示 agent 名称
- [ ] 错误消息也显示对应 agent 名称
- [ ] Stop 后恢复输入时，当前会话 agent 仍保留
- [ ] 切换到绑定了不同 agent 的历史会话时，胶囊正确恢复
- [ ] 切换到未绑定 agent 的历史会话时，胶囊显示默认 MindOS
- [ ] 旧 session / 旧 message 数据不报错且 UI 正常
- [ ] 所有新增/修改测试通过
