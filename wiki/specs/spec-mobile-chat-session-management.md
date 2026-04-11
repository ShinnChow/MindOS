# Spec: Mobile Chat Session Management

## 目标
让用户可以管理多个聊天会话：保存当前会话、切换回历史会话、开始新会话而不丢失旧对话。

## 现状分析
当前 `useChat` hook 只支持单个会话：
1. `CHAT_STORAGE_KEY` 直接存 `Message[]`，不关联 session id
2. `newChat()` 会清空消息、生成新 sessionId、删除旧消息存储——用户**无法找回**之前的对话
3. `ChatSession` 类型早已在 `types.ts` 定义，但从未被使用
4. Chat tab UI 只有 "New Chat" 按钮，没有会话列表入口

这对移动端用户尤其痛：经常需要在多个话题间切换，但每次新建都会丢失所有历史。

## 数据流 / 状态流
```text
Chat tab mounted
  ↓
useChatSessions hook 从 AsyncStorage 加载 sessions list
  ↓
加载 activeSessionId 对应的 messages 到 useChat
  ↓
用户发消息 → messages 更新 → 同步到当前 session
  ↓
用户点击"会话列表" → 展开 drawer/modal
  ↓
点击其他会话 → switchSession(id)
  ↓
useChatSessions 更新 activeSessionId
useChat 加载对应 messages
  ↓
用户点击"新建会话" → createSession()
  ↓
新 session 追加到 sessions list，切换为 active
旧 session 保留

删除会话 → deleteSession(id)
重命名会话 → renameSession(id, title)
```

重点读写边界：
- **读**：`AsyncStorage.getItem(SESSIONS_KEY)` 拿全部会话元数据；`AsyncStorage.getItem(SESSION_MESSAGES_PREFIX + id)` 拿具体消息
- **写**：消息变化时写对应 session 的 messages key；activeSessionId 变化时写 active key
- **缓存**：当前 active session 的 messages 常驻内存，其他 session 只保留元数据

## 方案

### User Flow

用户目标：在多个话题间自由切换，新建会话不丢失旧对话，可管理（重命名/删除）历史会话。

前置条件：用户已连接服务并进入 Chat tab。

Step 1: 用户进入 Chat tab
  → 系统反馈：看到当前 active 会话（如有）或空状态
  → 状态变化：`useChatSessions` 加载 sessions list 和 activeSessionId

Step 2: 用户点击 header 左侧"会话列表"图标
  → 系统反馈：弹出 session list drawer/modal；显示按时间排序的历史会话
  → 状态变化：showSessionList = true

Step 3: 用户点击某个历史会话
  → 系统反馈：drawer 收起；主区加载该会话消息
  → 状态变化：activeSessionId 切换；messages 加载新 session 数据

Step 4: 用户点击"New Chat"
  → 系统反馈：创建新会话，旧会话保留在列表中；主区变为空状态
  → 状态变化：sessions list 新增一项；activeSessionId 指向新会话；旧消息不丢失

Step 5: 用户在 session list 长按某会话
  → 系统反馈：弹出操作菜单（Rename / Delete）
  → 状态变化：无，等待用户选择

Step 6: 用户选择 Rename
  → 系统反馈：弹出输入框，默认值为当前 title（或第一条消息）
  → 状态变化：输入确认后更新 session.title

Step 7: 用户选择 Delete
  → 系统反馈：确认弹窗"删除此会话？不可恢复"
  → 状态变化：确认后从 list 移除；若删除的是 active session，自动切换到最近的其他会话或空状态

成功结果：用户可自由管理多个聊天会话，历史对话不丢失。

异常分支：
- 异常 A：AsyncStorage 读取失败 → 降级为单会话模式，显示 toast 提示
- 异常 B：消息持久化失败 → 消息仍在内存，下次 app 启动尝试恢复
- 异常 C：删除 active session 时无其他会话 → 自动创建一个新空会话

边界场景：
- 会话数量达到上限（建议软限制 50 条，超出自动归档最旧）
- 单会话消息过多（延用现有 200 条截断策略）
- 用户快速切换会话时的竞态
- 首次使用：迁移现有单会话数据为第一个 session

### UI 状态线框图

```text
┌─ 状态 1：会话中 ────────────────────────────┐
│  [ ≡ ]  Summarize my notes...    [ + ]      │
│  ────────────────────────────────────────── │
│  [user] Summarize my notes                  │
│  [AI]   Here's a summary...                 │
│                                              │
│  [_______________] [ Send ]                 │
└──────────────────────────────────────────────┘

┌─ 状态 2：会话列表 Drawer ───────────────────┐
│  Sessions                         [ × ]     │
│  ────────────────────────────────────────── │
│  [✓] Summarize notes          10m ago       │
│  [ ] Research project         2h ago        │
│  [ ] Meeting prep             Yesterday     │
│                                              │
│         [ + New Chat ]                      │
└──────────────────────────────────────────────┘

┌─ 状态 3：长按菜单 ─────────────────────────┐
│  Research project                           │
│  [ Rename ]                                 │
│  [ Delete ]                                 │
│  [ Cancel ]                                 │
└──────────────────────────────────────────────┘

┌─ 状态 4：空状态（无会话）──────────────────┐
│  [ ≡ ]  New Chat                 [ + ]      │
│  ────────────────────────────────────────── │
│                  ◆                          │
│          Ask MindOS                         │
│   Ask anything about your knowledge base    │
│                                              │
│  [_______________] [ Send ]                 │
└──────────────────────────────────────────────┘
```

### 状态流转图

```text
[空状态] ──发送消息──→ [会话中]
    │                     │
    └──点开 list──→ [Drawer]
                     │
                     ├──点击其他会话──→ [会话中(另一个)]
                     ├──点 New Chat──→ [空状态]
                     └──长按──→ [菜单] ──Rename/Delete──→ [Drawer]
```

### 方案对比

方案 A：纯本地 AsyncStorage 多会话管理
- 用户体验质量：⭐⭐⭐⭐⭐
- 实现复杂度：中
- 可维护性：高
- 风险：数据只在本地，卸载/换机丢失

方案 B：同步到服务器 /api/chat/sessions
- 用户体验质量：⭐⭐⭐⭐⭐
- 实现复杂度：高
- 可维护性：中
- 风险：需要后端支持、auth、网络状态处理

方案 C：沿用单会话，新建覆盖（现状）
- 用户体验质量：⭐
- 实现复杂度：无
- 可维护性：-
- 风险：用户数据丢失

#### UI 方案对比线框图

```text
方案 A：本地多会话                  方案 B：云同步多会话
┌─────────────────────────┐       ┌─────────────────────────┐
│ [ ≡ ] header            │       │ [ ≡ ] header            │
│ Session list drawer     │       │ Session list + cloud    │
│ 本地存储                 │       │ 需 auth + network       │
└─────────────────────────┘       └─────────────────────────┘
UX：⭐⭐⭐⭐⭐ 离线可用             UX：⭐⭐⭐⭐⭐ 跨设备同步
复杂度：中                         复杂度：高
```

选择：**方案 A**。

原因：方案 A 满足"多会话不丢失"的核心需求，且不依赖后端改动。方案 B 是未来增量，但不应阻塞基础多会话功能。

## 影响范围
- 变更文件列表
  - `mobile/lib/chat-session-store.ts`（新增）
  - `mobile/hooks/useChat.ts`（重构为使用 session store）
  - `mobile/hooks/useChatSessions.ts`（新增，管理 sessions list）
  - `mobile/components/chat/SessionListDrawer.tsx`（新增）
  - `mobile/app/(tabs)/chat.tsx`（集成 drawer + session 切换）
  - `mobile/__tests__/chat-session-store.test.ts`（新增）
- 受影响的其他模块
  - `ChatInput`、`MessageBubble` 不变，只消费 messages
  - 后端 `/api/ask` 不变，只需要 sessionId
- 是否有破坏性变更
  - 迁移：现有 `CHAT_STORAGE_KEY` 数据迁移为 default session

## 边界 case 与风险
- 边界 case 1：首次使用，无任何会话
  - 处理：自动创建一个空 session，不显示误导性"选择会话"
- 边界 case 2：迁移旧数据
  - 处理：检测到旧 key 存在时，迁移为第一个 session，删除旧 key
- 边界 case 3：会话数量过多
  - 处理：软限制 50，超出时提示用户删除旧会话
- 边界 case 4：快速切换导致数据未保存
  - 处理：切换前先完成当前 session 持久化
- 风险 1：AsyncStorage 读写失败
  - mitigation：catch + toast 提示，降级内存模式
- 风险 2：消息量大导致 JSON 序列化慢
  - mitigation：沿用 200 条截断策略；延迟持久化

## 验收标准
- [ ] 用户可创建新会话而不丢失旧会话
- [ ] 用户可通过 drawer 查看并切换历史会话
- [ ] 用户可重命名会话
- [ ] 用户可删除会话（带确认）
- [ ] 删除 active session 后自动切换到其他会话或空状态
- [ ] 首次使用时自动迁移旧单会话数据
- [ ] 新增测试覆盖 session CRUD、切换、迁移、边界 case
- [ ] `cd mobile && npm run typecheck` 通过
- [ ] `cd mobile && npx vitest run` 通过
