# Spec: Channel Detail Page UX Redesign

> 重新定位 Channel 详情页，从"配置表单"变为"渠道管理中心"。

## 目标

用户点进一个 Channel（如 Feishu）后，能立刻理解：
1. **这个渠道是干嘛的** — 用来接收什么，不是"聊天"
2. **它现在有没有在工作** — 状态摘要、最近活动
3. **怎么维护它** — 凭证、默认接收者、通知类型
4. **怎么测试它** — 发示例消息

---

## 现状分析

### 当前页面

当前 Channel 详情页只有 4 个区块：
1. Status info（仅 bot 名、capabilities）
2. Credential update form
3. Test Send（手动填 recipient 和 message）
4. Disconnect (Danger zone)

### 核心问题

| 问题 | 影响 |
|------|------|
| **无用途说明** | 用户不知道"连上了然后呢" |
| **无运行状态** | 用户不知道"它在不在工作" |
| **无活动记录** | 用户不知道"最近发了什么" |
| **Test Send 太技术化** | 用户不理解 Recipient ID 是什么 |
| **心智错位** | 用户误以为这是"聊天页" |

---

## 数据流 / 状态流

```
[Page Load]
     │
     ▼
┌──────────────────────────────────────────────────────────────┐
│  并行请求                                                      │
│  ├─ GET /api/im/status   → platforms[], connected, botName   │
│  ├─ GET /api/im/config   → masked credentials (只有已连接时)  │
│  └─ GET /api/im/activity → recent activity (新增 API)        │
└──────────────────────────────────────────────────────────────┘
     │
     ▼
[Render Page]
     │
     ├─ Purpose section (static, i18n)
     ├─ Status summary card (status + lastActivity + defaultRecipient)
     ├─ Recent activity list (最近 5 条)
     ├─ Quick test section (send sample)
     ├─ Settings section (collapsed by default)
     │    ├─ Credentials
     │    ├─ Default recipient
     │    └─ Notification types (future)
     └─ Danger zone (disconnect)
```

### 受影响的组件

| 组件 | 改动类型 |
|------|---------|
| `AgentsContentChannelDetail.tsx` | 重写结构 |
| `app/lib/im/platforms.ts` | 增加 purpose 描述 |
| `app/lib/i18n/modules/panels.ts` | 新增 i18n keys |
| `app/app/api/im/activity/route.ts` | **新增** — 活动记录 API |
| `app/lib/im/activity.ts` | **新增** — 活动存储（~/.mindos/im-activity.json） |
| `app/lib/im/executor.ts` | 改动 — 发送成功/失败时记录活动 |

---

## User Flow

### 场景 1：首次打开已连接的渠道

**用户目标**：了解这个渠道在做什么、验证它在工作。

**前置条件**：用户已配置 Feishu 凭证，状态为 Connected。

```
Step 1: 用户点击侧边栏 Channels → Feishu
  → 系统反馈：页面加载，显示 skeleton 占位
  → 状态变化：发起 3 个并行 API 请求

Step 2: 数据返回，页面渲染
  → 系统反馈：
    - 顶部：渠道图标 + 名称 + "Connected" badge
    - Purpose 区：一句话说明 + 用途列表
    - Status 摘要：连接状态、bot 名、最近活动时间
    - 最近活动：列出最近 3-5 条发送记录
    - Quick Test：简化的测试发送入口
    - Settings（折叠）：凭证维护、默认接收者

Step 3: 用户点击 Quick Test → Send sample
  → 系统反馈：按钮变 loading，发送中
  → 状态变化：POST /api/im/test，记录活动

Step 4: 发送成功
  → 系统反馈：成功 toast，活动列表顶部新增一条
  → 状态变化：activity 写入本地存储

成功结果：用户确认渠道在工作，理解它的用途。
```

### 场景 2：首次配置新渠道

**用户目标**：连接一个新的消息渠道。

**前置条件**：用户从 Channels 列表点击一个未配置的平台。

```
Step 1: 用户点击 Telegram
  → 系统反馈：页面显示 "Not configured" 状态
  → 状态变化：无

Step 2: 页面渲染未配置状态
  → 系统反馈：
    - Purpose 区：说明连接后能做什么
    - Setup Guide：分步指南 + 外部链接
    - Credential Form：输入框 + Save 按钮

Step 3: 用户填写凭证，点击 Save
  → 系统反馈：按钮 loading，显示 "验证中..."
  → 状态变化：POST /api/channels/verify → PUT /api/im/config

Step 4a: 验证成功
  → 系统反馈：成功 toast，页面刷新为 Connected 状态
  → 状态变化：凭证保存，status 更新

Step 4b: 验证失败
  → 系统反馈：错误信息显示（含具体原因）
  → 状态变化：凭证未保存

成功结果：用户完成首次配置，看到 Connected 状态。
```

### 异常分支

| 异常 | 触发条件 | 系统处理 | 用户看到 |
|------|---------|---------|---------|
| 网络错误 | API 请求失败 | 显示 error 状态 + Retry 按钮 | "无法加载渠道状态" |
| 凭证过期 | 发送失败返回 401 | 高亮 Update credentials | "凭证可能已过期，请更新" |
| 平台限流 | 发送失败返回 429 | 显示等待时间 | "发送过于频繁，请等 X 秒" |
| 无效接收者 | 发送失败返回 400 | 显示具体错误 | "接收者 ID 格式错误" |

### 边界场景

| 场景 | 处理方式 |
|------|---------|
| 活动记录为空 | 显示空状态："还没有发送过消息" + 引导测试 |
| 活动记录超过 100 条 | 自动清理，只保留最近 100 条 |
| 多个平台同时操作 | 每个平台独立状态，互不影响 |
| 页面切换时操作进行中 | 请求继续执行，返回时刷新状态 |

---

## UI 线框图

### 状态 1：已连接 (Connected)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Channels                                                 │
│                                                                     │
│  🐦 Feishu                                          [Connected ✓]   │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│  ┌─ How it works ──────────────────────────────────────────────┐   │
│  │  MindOS uses Feishu to send you notifications and results.  │   │
│  │                                                             │   │
│  │  • Agent completion alerts                                  │   │
│  │  • Error notifications                                      │   │
│  │  • Test messages                                            │   │
│  │                                                             │   │
│  │  This is not a chat inbox.                    [Setup docs ↗]│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ Status ────────────────────────────────────────────────────┐   │
│  │  Bot: @MindOS_Bot              Last activity: 2 min ago     │   │
│  │  Default recipient: Not set    Capabilities: text, file     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ Recent Activity ───────────────────────────────────────────┐   │
│  │  ✓ Test sent to ou_xxx              Today 14:32            │   │
│  │  ✓ Agent result delivered           Today 11:05            │   │
│  │  ✗ Failed: invalid recipient        Yesterday              │   │
│  │                                                             │   │
│  │  [ View all activity ]                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ Quick Test ────────────────────────────────────────────────┐   │
│  │  Recipient  [________________________] (e.g., ou_xxx)       │   │
│  │  Message    [Hello from MindOS       ]                      │   │
│  │                                                             │   │
│  │  [ Send sample ]                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ▸ Settings                                                         │
│    └─ Update credentials                                            │
│    └─ Set default recipient                                         │
│                                                                     │
│  ┌─ Danger zone ───────────────────────────────────────────────┐   │
│  │  Remove credentials and disconnect.       [ Disconnect ]    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 状态 2：未配置 (Not Configured)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Channels                                                 │
│                                                                     │
│  📱 Telegram                                     [Not configured]   │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│  ┌─ How it works ──────────────────────────────────────────────┐   │
│  │  Connect Telegram to receive MindOS updates on the go.      │   │
│  │                                                             │   │
│  │  • Agent completion alerts                                  │   │
│  │  • Error notifications                                      │   │
│  │  • Test messages                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ Setup Guide ───────────────────────────────────────────────┐   │
│  │  1. Open Telegram → search @BotFather                       │   │
│  │  2. Send /newbot → follow prompts                           │   │
│  │  3. Copy the token below                                    │   │
│  │                                                [Open docs ↗]│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ Configure ─────────────────────────────────────────────────┐   │
│  │  Bot Token (required)                                       │   │
│  │  [______________________________________] 👁                │   │
│  │  Format: 123456789:AABBccDD-EeFfGgHh...                     │   │
│  │                                                             │   │
│  │  [ Save and Connect ]                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 状态 3：加载中 (Loading)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Channels                                                 │
│                                                                     │
│  🐦 Feishu                                                          │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ████████████████████████████████████████████████████████   │   │
│  │  ████████████████████                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ████████████   ████████████████████████████████████████   │   │
│  │  ████████████   ████████████████████                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ████████████████████████████████████████████████████████   │   │
│  │  ████████████████████████████████████████████████████████   │   │
│  │  ████████████████████████████████████████████████████████   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 状态 4：错误 (Error)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Channels                                                 │
│                                                                     │
│                                                                     │
│                        ⚠️                                           │
│                                                                     │
│              Unable to load channel status                          │
│              Network error. Please check your connection.           │
│                                                                     │
│                      [ Retry ]                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 状态 5：活动为空 (Empty Activity)

```
┌─ Recent Activity ───────────────────────────────────────────────┐
│                                                                 │
│                        📭                                       │
│                                                                 │
│              No messages sent yet                               │
│              Send a test message to verify                      │
│              the connection is working.                         │
│                                                                 │
│              [ Send test message ]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 状态流转图

```
                              ┌───────────────┐
                              │   Page Load   │
                              └───────┬───────┘
                                      │
                              ┌───────▼───────┐
                              │   Loading     │
                              └───────┬───────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
            ┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐
            │    Error      │ │  Connected    │ │ Not Config    │
            └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
                    │                 │                 │
              [Retry]                 │           [Save Config]
                    │                 │                 │
                    └──────►──────────┴─────────◄──────┘
                                      │
                              ┌───────▼───────┐
                              │   Loading     │
                              └───────────────┘
```

```
Connected State Internal:

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   [Send Test] ──► [Sending...] ──┬──► [Success] ──► [Update    │
│                                  │                  Activity]  │
│                                  │                              │
│                                  └──► [Error Toast]             │
│                                                                 │
│   [Update Creds] ──► [Expand Settings] ──► [Save] ──► [Reload] │
│                                                                 │
│   [Disconnect] ──► [Confirm?] ──► [Delete] ──► [Not Config]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 方案对比

### 方案 A：增量改进（只改 UI 结构，不加 Activity API）

```
┌─ 方案 A ──────────────────────────────────────┐
│                                               │
│  • 重组现有区块顺序                            │
│  • 增加 Purpose 说明                          │
│  • Settings 折叠                              │
│  • 无活动记录功能                              │
│                                               │
│  用户体验质量：⭐⭐⭐ (3/5)                     │
│  实现复杂度：低                                │
│  可维护性：高                                  │
│  风险：无新 API/存储                           │
│                                               │
│  缺点：用户仍不知道"它在工作吗"                 │
│                                               │
└───────────────────────────────────────────────┘
```

### 方案 B：完整重设计（含 Activity API + 状态摘要）

```
┌─ 方案 B ──────────────────────────────────────┐
│                                               │
│  • 完整重构页面结构                            │
│  • 新增 Purpose + Status summary              │
│  • 新增 Activity API + 本地存储               │
│  • Settings 折叠 + Default recipient          │
│  • Quick Test 简化                            │
│                                               │
│  用户体验质量：⭐⭐⭐⭐⭐ (5/5)                  │
│  实现复杂度：中                                │
│  可维护性：中（新增 1 个 API + 1 个存储文件）   │
│  风险：Activity 存储需要维护清理逻辑            │
│                                               │
│  优点：用户能完整理解和管理渠道                 │
│                                               │
└───────────────────────────────────────────────┘
```

### 方案 C：最小 MVP（只加 Purpose 说明）

```
┌─ 方案 C ──────────────────────────────────────┐
│                                               │
│  • 只增加 Purpose 区块                         │
│  • 保持其他结构不变                            │
│                                               │
│  用户体验质量：⭐⭐ (2/5)                       │
│  实现复杂度：极低                              │
│  可维护性：高                                  │
│  风险：无                                     │
│                                               │
│  缺点：解决不了"不知道它在不在工作"的问题        │
│                                               │
└───────────────────────────────────────────────┘
```

### 选择：方案 B

**理由**：
1. 用户核心困惑是"这个页面干嘛的"+"它在不在工作"，方案 A/C 只解决一半
2. Activity 功能虽然增加复杂度，但用户价值极高
3. 复杂度可控：Activity 存储是本地 JSON，无需数据库
4. 符合 JTBD："我想知道这个渠道在工作"

---

## 技术设计

### 新增 API：`GET /api/im/activity`

```typescript
// Request
GET /api/im/activity?platform=feishu&limit=10

// Response
{
  activities: [
    {
      id: string;
      platform: 'feishu';
      type: 'test' | 'agent' | 'manual';
      status: 'success' | 'failed';
      recipient: string;
      message: string;        // truncated to 50 chars
      error?: string;
      timestamp: string;      // ISO 8601
    }
  ]
}
```

### 新增存储：`~/.mindos/im-activity.json`

```typescript
interface IMActivityStore {
  version: 1;
  activities: {
    [platform: string]: IMActivity[];  // 每平台最多 100 条
  };
}
```

### 新增 Types

```typescript
// app/lib/im/activity.ts

interface IMActivity {
  id: string;
  platform: IMPlatform;
  type: 'test' | 'agent' | 'manual';
  status: 'success' | 'failed';
  recipient: string;
  message: string;
  error?: string;
  timestamp: string;
}

interface IMActivityStore {
  version: 1;
  activities: Record<string, IMActivity[]>;
}
```

### 改动 executor.ts

在 `sendIMMessage()` 成功/失败时调用 `recordActivity()`。

---

## 影响范围

### 变更文件列表

| 文件 | 类型 | 说明 |
|------|------|------|
| `app/components/agents/AgentsContentChannelDetail.tsx` | 重写 | 完整重构页面结构 |
| `app/lib/im/platforms.ts` | 改动 | 增加 `purpose` 字段 |
| `app/lib/i18n/modules/panels.ts` | 改动 | 新增 ~20 个 i18n keys |
| `app/lib/im/activity.ts` | **新增** | Activity 存储逻辑 |
| `app/lib/im/types.ts` | 改动 | 新增 Activity 类型 |
| `app/lib/im/executor.ts` | 改动 | 发送时记录活动 |
| `app/app/api/im/activity/route.ts` | **新增** | Activity API |
| `app/__tests__/im/activity.test.ts` | **新增** | Activity 单元测试 |

### 不受影响的模块

| 模块 | 原因 |
|------|------|
| `AgentsContentChannels.tsx` (Overview) | 只读取 status，不涉及 activity |
| `IMChannelsView.tsx` (Sidebar) | 只显示连接状态点 |
| 各平台 adapter | 发送逻辑不变，只在上层记录 |
| CLI `mindos channel` | 不涉及 UI |

---

## 边界 Case 与风险

### 边界 Case

| Case | 处理方式 |
|------|---------|
| im-activity.json 不存在 | 首次写入时自动创建 |
| im-activity.json 损坏 | 静默重置为空，不影响功能 |
| 活动超过 100 条 | FIFO 清理，只保留最近 100 条 |
| 并发写入 | 用简单的文件锁或 atomic write |
| 大量平台同时发送 | 每平台独立数组，互不影响 |
| 用户手动删除 activity 文件 | 下次发送时重新创建 |

### 已知风险

| 风险 | 缓解措施 |
|------|---------|
| Activity 文件过大 | 限制每平台 100 条，超过自动清理 |
| 时区问题 | 统一使用 ISO 8601，客户端格式化 |
| 隐私：message 内容存储 | 只存储前 50 字符，可配置关闭 |

---

## 验收标准

### 功能验收

- [ ] 已连接渠道显示 Purpose 说明、状态摘要、最近活动
- [ ] 未配置渠道显示 Purpose 说明、Setup Guide、配置表单
- [ ] 发送测试消息后，活动列表立即更新
- [ ] 发送失败时，活动列表显示错误信息
- [ ] Settings 区块默认折叠，展开后可更新凭证
- [ ] Disconnect 需要二次确认

### UX 验收

- [ ] 用户不需要思考"这个页面是干嘛的"
- [ ] 用户能在 5 秒内判断"这个渠道在不在工作"
- [ ] 新用户能按 Setup Guide 完成首次配置
- [ ] 错误信息告诉用户具体问题和解决方法

### 技术验收

- [ ] Activity API 返回正确的数据结构
- [ ] Activity 存储不超过 100 条/平台
- [ ] 所有新增文案有中英文版本
- [ ] 单元测试覆盖 Activity 读写逻辑
- [ ] 无 TypeScript 类型错误
- [ ] 无控制台 warning/error

---

## 实现计划

1. **Phase 1: Types + API (30 min)**
   - 定义 Activity types
   - 实现 activity.ts 存储逻辑
   - 实现 /api/im/activity route
   - 写单元测试

2. **Phase 2: executor 改动 (15 min)**
   - 在 sendIMMessage 成功/失败时记录活动
   - 测试发送后活动被记录

3. **Phase 3: UI 重构 (45 min)**
   - 重构 AgentsContentChannelDetail
   - 新增 Purpose 区块
   - 新增 Status summary
   - 新增 Activity list
   - Settings 折叠

4. **Phase 4: i18n + Polish (20 min)**
   - 新增所有 i18n keys
   - 视觉精修
   - 截图验证

5. **Phase 5: Review + Test (20 min)**
   - Red team review
   - User walkthrough
   - 全量测试
