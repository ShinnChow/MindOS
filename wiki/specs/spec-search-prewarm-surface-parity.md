# Spec: Search 预热体验一致性

## 目标

让 SearchModal 与 SearchPanel 在“首次打开搜索”时都提供一致的非阻塞预热体验，避免用户在不同搜索入口之间感受到明显不一致的等待行为。

## 现状分析

当前 SearchPanel 已支持后台预热 UI 搜索索引，但 SearchModal 仍然保留旧行为：用户打开弹层后，第一次输入查询才触发真正的冷索引建立。因此同一个搜索能力在两个入口表现不一致：侧边栏搜索会提前 warming，弹层搜索则把首搜成本直接暴露给用户。对用户来说，这种不一致比单纯的“有点慢”更容易造成困惑。

Why?
- 搜索弹层是高频入口，尤其是快捷检索场景。
- 既然 SearchPanel 已优化，同类入口继续保留旧体验会削弱整体收益。

Simpler?
- 直接把 SearchPanel 逻辑复制到 SearchModal，短期可行，但会制造第二份状态机，后续再次漂移。
- 更简单且长期更优的方式，是抽出共享预热状态逻辑，让两个入口统一行为。

## 用户流 / 状态流

### 用户目标
在任一搜索入口打开后，系统都能温和地提前准备搜索，而不是让第一次输入承担全部冷启动成本。

### 前置条件
- 用户已进入应用。
- Search UI 索引可能尚未建立。
- 用户从 SearchPanel 或 SearchModal 任一入口进入搜索。

### User Flow

Step 1: 用户打开 SearchPanel 或 SearchModal
  → 系统反馈：输入框立即可用
  → 状态变化：若本轮还没尝试过预热，则后台发起 `/api/search/prewarm`

Step 2: 系统后台预热索引
  → 系统反馈：显示轻量 warming 文案，不阻塞输入
  → 状态变化：索引命中 cache -> `ready`；构建成功 -> `ready`；请求失败 -> `fallback`

Step 3: 用户开始输入
  → 系统反馈：沿用现有 loading spinner / skeleton
  → 状态变化：两种搜索入口都复用同一套 warm state 判定逻辑

Step 4: 文件内容变化
  → 系统反馈：当前搜索 UI 不闪动
  → 状态变化：共享预热状态监听 `mindos:files-changed` 后重置为 `idle`

成功结果：
- SearchPanel / SearchModal 的首次搜索体验一致
- warming / fallback / ready 的状态切换规则一致

异常分支：
- 异常 A：prewarm API 失败 → UI 进入 `fallback`，但搜索仍可继续
- 异常 B：用户在 warming 中立即输入 → 沿用原查询路径，不阻塞
- 异常 C：组件隐藏但未卸载 → 后台完成结果不应被错误丢弃

边界场景：
- 重复打开 SearchModal，不应无限重复预热
- 文件变化后再次打开任一入口，应允许重新预热
- 不同 locale 下 warming 文案必须一致且可翻译

### UI 线框图

#### 状态 1：SearchPanel / SearchModal 首次打开
```text
┌─ SEARCH ─────────────────────────────┐
│ [ Search files...                 ] │
│ Preparing search...                 │
│                                      │
│  用户可立即输入                      │
└──────────────────────────────────────┘
```

#### 状态 2：预热完成
```text
┌─ SEARCH ─────────────────────────────┐
│ [ Search files...                 ] │
│                                      │
│  Type a file name or keyword         │
└──────────────────────────────────────┘
```

#### 状态 3：预热失败 / 降级
```text
┌─ SEARCH ─────────────────────────────┐
│ [ Search files...                 ] │
│ Search will prepare on first query.  │
│                                      │
│  用户仍可继续输入                     │
└──────────────────────────────────────┘
```

### 状态流转图

```text
[idle] ── 打开任一搜索入口 ──→ [warming]
[warming] ── success ──→ [ready]
[warming] ── error ──→ [fallback]
[warming] ── 用户输入 ──→ [querying]
[fallback] ── 用户输入 ──→ [querying]
[files-changed] ──→ [idle]
```

## 方案

### 方案 A：在 SearchModal 复制一份 SearchPanel 逻辑
- 用户体验质量：⭐⭐⭐⭐
- 实现复杂度：低
- 可维护性：低
- 风险：两份逻辑以后继续漂移

### 方案 B：抽出共享 prewarm 状态 hook（推荐）
- 用户体验质量：⭐⭐⭐⭐⭐
- 实现复杂度：中
- 可维护性：高
- 风险：需要小心处理组件隐藏与卸载差异

### 方案 C：把 prewarm 提升到更高层级的全局 store
- 用户体验质量：⭐⭐⭐⭐⭐
- 实现复杂度：高
- 可维护性：中
- 风险：过度设计；本轮范围不值得

### 选择说明
选择 **方案 B**。

原因：
1. 用户得到一致体验。
2. 代码只维护一套状态机，不再复制。
3. 比全局 store 更克制，范围更可控。

## 数据流 / 状态流

```text
useSearchPrewarm(active/open)
  ├─ shouldStartSearchPrewarm()
  ├─ GET /api/search/prewarm
  ├─ warmState: idle|warming|ready|fallback
  └─ subscribe mindos:files-changed -> reset idle

SearchPanel
  └─ useSearchPrewarm(active)

SearchModal
  └─ useSearchPrewarm(open)
```

## 影响范围

- 变更文件：
  - `app/lib/types.ts`
  - `app/components/panels/SearchPanel.tsx`
  - `app/components/SearchModal.tsx`
  - `app/hooks/useSearchPrewarm.ts`（新增）
  - `app/__tests__/panels/search-panel-prewarm.test.ts`
  - `app/__tests__/components/search-modal-prewarm.test.tsx`（新增）
- 不受影响：
  - `/api/search/prewarm`
  - Core search / MCP search
- 破坏性变更：无

## 架构审查

- Library-First：复用 React hook，不引入新库
- Clean Architecture：共享状态机在 hook 层，组件只负责渲染
- 命名规范：用 `useSearchPrewarm`，不用 `shared/helpers/common`
- 复杂度预判：
  - hook 控制在 50 行左右
  - 两个组件只保留展示差异

## 边界 case 与风险

1. 面板关闭但组件未卸载
   - 处理：区分 `active/open=false` 与 unmount
2. 文件变化后索引失效
   - 处理：统一监听 `mindos:files-changed`
3. SearchModal 每次打开会 reset query
   - 处理：reset query 不等于 reset warmState；hook 自己维护防重
4. locale 文案漂移
   - 处理：两个入口都走同一组 i18n key

## Spec 对抗性审查

### 第 1 轮：完整性攻击
发现问题 1：如果只提“共享 hook”，但不说明 SearchModal 的 `open` 与 SearchPanel 的 `active` 差异，hook 很容易误判隐藏/卸载。
- 修复：在数据流和边界 case 里明确两类触发源。

发现问题 2：如果不把 `files-changed` 重置写进 spec，SearchModal 仍可能复用过期 warmState。
- 修复：补充到 User Flow 与边界 case。

### 第 2 轮：可行性攻击
发现问题 1：方案 C 虽然更“统一”，但会把一个中等复杂度问题升级成全局 store 改造。
- 修复：拒绝方案 C。

发现问题 2：如果继续复制逻辑，后续 SearchPanel 和 SearchModal 的 fallback 行为会再次分叉。
- 修复：选择共享 hook 方案。

## 验收标准

- [ ] SearchModal 打开时会触发与 SearchPanel 一致的 prewarm 行为
- [ ] SearchModal / SearchPanel 使用同一套 warmState 判断逻辑
- [ ] warming / fallback 文案在两个入口保持一致并走 i18n
- [ ] 文件变化后，两个入口都会重置为可再次预热状态
- [ ] 新增测试覆盖 SearchModal 的 warming/fallback 行为
