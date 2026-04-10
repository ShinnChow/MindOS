# Spec: Mobile Files Feedback and Rename Reliability

## 目标
让移动端 Files tab 在加载失败时给出明确、可恢复的反馈，并保证 Android 重命名弹窗始终显示正确的默认值。

## 现状分析
当前 `mobile/app/(tabs)/files.tsx` 存在两个直接影响用户体验的问题：

1. `load()` 失败时被静默吞掉，用户只会看到空列表，分不清是“真的没有文件”还是“网络/服务出错”。
2. Android 使用 `TextInputModal` 做重命名，但组件内部 `useState(defaultValue)` 只初始化一次；当用户连续重命名不同文件时，输入框可能残留上一个文件名。

这两个问题都属于“系统状态不可见”与“状态同步不可靠”，会直接破坏用户对文件管理的掌控感。

## 数据流 / 状态流
```text
Files tab mounted / pull to refresh / file mutation success
  ↓
files screen 调用 mindosClient.getFileTree()
  ↓
[成功] setTree + clear error + 渲染文件列表
[失败] setError(message) + 保留现有 tree + 渲染 inline error banner

Android rename flow
  ↓
用户长按文件 → 选择 Rename
  ↓
Files screen 设置 renameTarget + 打开 TextInputModal
  ↓
TextInputModal 监听 defaultValue 变化并同步到内部 input state
  ↓
用户提交
  ↓
mindosClient.renameFile(path, newName)
  ↓
[成功] 关闭 modal + reload tree
[失败] Alert 错误提示 + 清理 renameTarget
```

重点标注：
- 读数据：`mindosClient.getFileTree()`
- 写数据：`mindosClient.renameFile()`
- UI 状态：`loading / refreshing / error / renameModalVisible / renameTarget`
- 状态同步边界：`TextInputModal.defaultValue -> value`

## 方案

### User Flow

用户目标：在 Files tab 里可靠地浏览文件，并在出错时知道发生了什么、怎么恢复。

前置条件：用户已连接 MindOS 服务并进入 mobile 的 Files tab。

Step 1: 用户进入 Files tab
  → 系统反馈：看到 loading 指示；若加载成功则看到文件列表，若失败则看到 inline error banner
  → 状态变化：screen 调用 `getFileTree()`，成功时更新 `tree`，失败时更新 `error`

Step 2: 用户下拉刷新
  → 系统反馈：顶部出现刷新指示；成功后错误 banner 消失，失败则保留并更新错误文案
  → 状态变化：`refreshing=true`，再次调用 `getFileTree()`

Step 3: 用户点击错误 banner 的 Retry
  → 系统反馈：重新触发加载；成功后回到正常列表，失败则继续展示错误信息
  → 状态变化：复用 `load()`，清理或更新 `error`

Step 4: 用户长按某个文件并选择 Rename（Android）
  → 系统反馈：弹出输入框，默认值始终是当前选中文件名
  → 状态变化：`renameTarget` 改变，`TextInputModal` 同步 `defaultValue`

Step 5: 用户连续重命名不同文件
  → 系统反馈：第二次打开弹窗时，输入框是第二个文件的名字，不会残留第一个文件名
  → 状态变化：modal 内部 `value` 随 `defaultValue` 变化重置

成功结果：Files tab 的失败状态可见且可恢复；Android 重命名不再串值。

异常分支：
- 异常 A：首次加载失败 → 显示 inline error banner + Retry，避免误判为空目录
- 异常 B：下拉刷新失败 → 保留现有列表，同时显示错误 banner，不把页面打成空白
- 异常 C：重命名请求失败 → Alert 显示错误，用户知道失败原因，并可重新操作

边界场景：
- 空文件树但网络正常
- 已有列表时网络突然断开
- 用户连续长按两个不同文件重命名
- `defaultValue` 为空字符串
- Retry 多次连续点击

### UI 状态线框图

```text
┌─ 状态 1：初始加载中 ───────────────────────┐
│  Files                                      │
│                                              │
│              ◌ Loading...                   │
│                                              │
└──────────────────────────────────────────────┘

┌─ 状态 2：正常列表 ─────────────────────────┐
│  Files                                      │
│  ├─ [doc] project.md                  >     │
│  ├─ [folder] inbox                    >     │
│  └─ [doc] notes.md                    >     │
│                                      [ + ]  │
└──────────────────────────────────────────────┘

┌─ 状态 3：错误但可恢复 ─────────────────────┐
│  Files                                      │
│  ┌──────────────────────────────────────┐   │
│  │ [cloud-off] Files are temporarily    │   │
│  │ unavailable                          │   │
│  │ connect ECONNREFUSED                 │   │
│  │               [ Retry ]              │   │
│  └──────────────────────────────────────┘   │
│  （下方仍保留上一次成功加载的列表，若有）      │
└──────────────────────────────────────────────┘

┌─ 状态 4：Android Rename Modal ─────────────┐
│          Rename File                         │
│  Enter new name for "notes.md"             │
│  [ notes________________________ ]          │
│  [ Cancel ]               [ Rename ]        │
└──────────────────────────────────────────────┘
```

### 状态流转图

```text
[初始加载] ──成功──→ [文件列表]
    │                │
    └──失败──→ [错误 banner]
                    │
                    ├──Retry──→ [初始加载]
                    └──下拉刷新──→ [刷新中] ──成功──→ [文件列表]

[文件列表] ──长按 Rename──→ [Rename Modal]
                               │
                               ├──取消──→ [文件列表]
                               ├──提交成功──→ [刷新中] ──→ [文件列表]
                               └──提交失败──→ [错误 Alert] ──→ [文件列表]
```

### 方案对比

方案 A：Files tab 加 inline error banner + 修 TextInputModal defaultValue 同步
- 用户体验质量：⭐⭐⭐⭐⭐
- 实现复杂度：低
- 可维护性：高
- 风险：只改善当前最痛点，不解决更长线的目录内导航模型

方案 B：重做 Files tab 为真正的层级目录浏览器
- 用户体验质量：⭐⭐⭐⭐⭐
- 实现复杂度：高
- 可维护性：中
- 风险：改动面大，容易碰到 ViewScreen / 路由现有行为，超出本轮范围

方案 C：只修 TextInputModal，不处理 Files tab 错误态
- 用户体验质量：⭐⭐
- 实现复杂度：低
- 可维护性：中
- 风险：核心“空白页误导”问题仍然存在

#### UI 方案对比线框图

```text
方案 A：Inline error in Files tab          方案 C：继续静默失败
┌───────────────────────────────┐         ┌───────────────────────────────┐
│ Files                         │         │ Files                         │
│ ┌───────────────────────────┐ │         │                               │
│ │ unavailable               │ │         │        （空白 / 空列表）       │
│ │ [ Retry ]                 │ │         │                               │
│ └───────────────────────────┘ │         │ 用户不知道是没文件还是失败     │
│ 旧列表仍保留（若有）           │         │                               │
└───────────────────────────────┘         └───────────────────────────────┘
UX：状态可见、可恢复 ⭐⭐⭐⭐⭐                UX：误导用户 ⭐
```

选择：**方案 A**。

原因：它以最小改动解决最大用户痛点，并且不破坏现有 Files / View 双屏结构。层级目录浏览器是值得做的下一步，但不该阻塞这轮“状态可见性”和“输入一致性”修复。

架构约束补充：当前 `files.tsx` 已明显偏长，本轮实现时需要顺手把文件内的错误展示或文件操作逻辑拆到更聚焦的模块中，避免继续堆叠在单文件里。

## 影响范围
- 变更文件列表
  - `mobile/app/(tabs)/files.tsx`
  - `mobile/components/TextInputModal.tsx`
  - `mobile/components/files/FilesErrorBanner.tsx`（新增）
  - `mobile/__tests__/text-input-modal.test.tsx`（新增）
  - `mobile/__tests__/files-screen.test.tsx`（新增或补充）
- 受影响的其他模块
  - `mindosClient.getFileTree()` / `renameFile()` 接口只被调用，不改实现
  - `ViewScreen` 不受影响
- 是否有破坏性变更
  - 无

## 边界 case 与风险
- 边界 case 1：首次加载失败且 tree 为空
  - 处理：显示 error banner，不显示误导性的纯空态文案
- 边界 case 2：刷新失败但已有旧数据
  - 处理：保留旧列表，同时显示错误 banner
- 边界 case 3：连续切换 rename target
  - 处理：modal 内部 `useEffect` 同步默认值
- 风险 1：error banner 和 empty state 同时出现，造成信息冲突
  - mitigation：有 error 时优先呈现错误语义，不把它当作“空目录”
- 风险 2：modal 在 submit 后清空 value，下一次 reopen 状态错误
  - mitigation：submit/cancel 后都依赖 `defaultValue` 同步，避免残留旧值
- 风险 3：重复点击 Retry 导致状态抖动
  - mitigation：复用现有 `load()`，保持幂等，不引入多套加载状态

## 验收标准
- [ ] Files tab 首次加载失败时显示明确的 inline error banner 和 Retry 按钮
- [ ] Files tab 刷新失败时保留已有列表，同时显示错误提示
- [ ] Retry 成功后 error banner 消失
- [ ] Android `TextInputModal` 在 `defaultValue` 变化时同步输入框内容
- [ ] 连续重命名两个不同文件时，第二次弹窗显示正确文件名
- [ ] 新增测试覆盖正常路径、边界 case、错误路径
- [ ] `cd mobile && npm run typecheck` 通过
- [ ] `cd mobile && npx vitest run` 通过
