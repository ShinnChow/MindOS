# Spec: Mobile Architecture Foundations

## 目标
在不大改移动端信息架构的前提下，收敛 `mobile/` 目录内重复的文件树/Markdown 展示逻辑，降低后续迭代风险，并让关键用户路径保持一致体验。

## 现状分析
当前 `mobile/` 已形成「Expo Router screen + components + hooks + lib」的基本分层，但仍存在两个明显结构问题：

1. 文件树相关逻辑分散在多个文件中，`flattenFiles`、`findNode`、排序和相对时间格式化没有共享领域边界。
2. Markdown 展示样式在 `view/[...path].tsx`、`MessageBubble.tsx`、`MarkdownEditor.tsx` 三处重复维护，已经出现细节漂移风险。

这会导致：
- 同类内容在不同页面显示风格逐渐不一致
- 修一次 bug 要改多处，容易漏改
- 新功能（搜索结果、附件预览、聊天引用）复用成本高

本次不做大规模页面拆分，优先做「可测试、低风险、立即见效」的基础层收敛。

## 数据流 / 状态流
用户进入移动端后，核心路径主要有三类：

```text
Home / Chat / Files 页面
  ↓ 读取 file tree
screen/component 调用共享 file-tree domain
  ↓
得到平铺文件列表 / 查找节点 / 排序后的 children / 相对时间文案
  ↓
UI 组件渲染列表、最近文件、附件选择器、目录页

Markdown 内容来源（文件页 / 聊天气泡 / 编辑器预览）
  ↓
screen/component 调用共享 markdown presentation module
  ↓
得到统一的 markdown style map（document / bubble）
  ↓
Markdown 组件渲染
```

重点读写边界：
- **读数据**：`mindosClient.getFileTree()` / `mindosClient.getFileContent()`
- **领域转换**：`mobile/lib/file-tree.ts`、`mobile/lib/markdown-styles.ts`
- **展示层消费**：`app/(tabs)/index.tsx`、`app/view/[...path].tsx`、`components/FileAttachmentPicker.tsx`、`components/MessageBubble.tsx`、`components/editor/MarkdownEditor.tsx`

## 方案

### User Flow

用户目标：在移动端中浏览文件、查看内容、在不同入口看到一致的文件信息与 Markdown 展示效果。

前置条件：用户已连接 MindOS 服务并进入 mobile 任一核心页面（Home / Files / Chat / View）。

Step 1: 用户进入 Home 页
  → 系统反馈：看到最近活动文件列表和相对时间文案
  → 状态变化：Home 通过共享 file-tree domain 计算平铺文件与时间文案

Step 2: 用户打开目录或附件选择器
  → 系统反馈：看到排序一致的文件/目录列表
  → 状态变化：页面通过共享 file-tree domain 完成节点查找与目录排序

Step 3: 用户查看 Markdown 文件预览
  → 系统反馈：标题、代码块、引用块、列表样式稳定一致
  → 状态变化：页面通过共享 markdown presentation module 获取 document 样式

Step 4: 用户在聊天中查看 AI 返回的 Markdown
  → 系统反馈：气泡中的 Markdown 呈现紧凑但仍保持品牌一致性
  → 状态变化：聊天组件通过共享 markdown presentation module 获取 bubble 样式

Step 5: 用户在编辑器里切到 Preview
  → 系统反馈：预览样式与文件页保持一致，不会出现明显漂移
  → 状态变化：编辑器复用共享 document 样式

成功结果：用户在 mobile 不同页面看到一致的文件信息和 Markdown 展示；开发者新增页面时可直接复用共享模块。

异常分支：
- 异常 A：file tree 为空 → UI 仍展示空状态，不因共享 domain 引入额外错误
- 异常 B：目标路径不存在 → 共享 `findNode` 返回 `null`，页面显示既有错误态
- 异常 C：时间戳缺失或非法 → 相对时间函数回退为空字符串或默认日期文案，不抛 UI 异常

边界场景：
- 空文件树 / 单节点树 / 深层嵌套树
- 重复多次渲染同一 markdown 内容
- 同一目录下目录与文件混排、同名不同大小写排序
- 当天 / 昨天 / 跨年时间格式

### UI 状态线框图

```text
┌─ 状态 1：Home 最近活动 ───────────────────────┐
│  Recently Active                             │
│  ├─ note-a.md          just now              │
│  ├─ note-b.md          8m ago                │
│  └─ note-c.md          Apr 9 09:20           │
└──────────────────────────────────────────────┘

┌─ 状态 2：目录页 ─────────────────────────────┐
│  project/                                    │
│  ├─ [folder] docs                            │
│  ├─ [file]   spec.md                         │
│  └─ [file]   notes.md                        │
└──────────────────────────────────────────────┘

┌─ 状态 3：文档预览 ───────────────────────────┐
│  # Heading                                   │
│  paragraph text                              │
│  ┌ code block ────────────────────────────┐  │
│  │ const x = 1                            │  │
│  └────────────────────────────────────────┘  │
│  ▌blockquote                                 │
└──────────────────────────────────────────────┘

┌─ 状态 4：聊天气泡 Markdown ───────────────────┐
│  AI                                           │
│  Here is the result:                          │
│  • bullet                                     │
│  `inline code`                                │
│  [link]                                       │
└──────────────────────────────────────────────┘
```

### 状态流转图

```text
[file tree API] ──成功──→ [共享 file-tree domain] ──→ [Home / Files / Attachment UI]
      │
      └──失败──→ [既有页面错误态]

[file content] ──markdown──→ [共享 markdown styles] ──→ [View / Chat / Editor Preview]
      │
      └──csv/tsv──→ [CSVTable]
```

### 方案对比

方案 A：抽取共享基础模块（file-tree + markdown styles）
- 用户体验质量：⭐⭐⭐⭐⭐
- 实现复杂度：低
- 可维护性：高
- 风险：需要保证抽取后视觉不回归

方案 B：先补测试，不抽逻辑
- 用户体验质量：⭐⭐⭐
- 实现复杂度：中
- 可维护性：中
- 风险：重复代码继续存在，测试会锁定坏结构

方案 C：直接把大 screen 全拆成 container + hooks + presentational components
- 用户体验质量：⭐⭐⭐⭐
- 实现复杂度：高
- 可维护性：高
- 风险：改动面太大，当前收益不如基础层收敛直接

#### UI 方案对比线框图

```text
方案 A：共享样式/领域模块               方案 B：每页继续内嵌逻辑
┌────────────────────────────┐      ┌────────────────────────────┐
│ View / Chat / Editor       │      │ View / Chat / Editor       │
│     ↓                      │      │  各自维护 markdownStyles    │
│ shared markdown module     │      │  各自维护 tree helpers      │
│     ↓                      │      │  漂移逐步扩大               │
│ 一致展示                   │      │  局部一致、整体分裂         │
└────────────────────────────┘      └────────────────────────────┘
UX：跨页一致 ⭐⭐⭐⭐⭐                   UX：靠人工维持 ⭐⭐⭐
```

选择：**方案 A**。

原因：它是当前用户体验和工程收益的最佳交集。相比大重构，方案 A 以更小风险解决最现实的问题，并为后续 screen 拆分和测试补齐打基础。

## 影响范围
- 变更文件列表
  - `mobile/lib/file-tree.ts`（新增）
  - `mobile/lib/markdown-styles.ts`（新增）
  - `mobile/app/(tabs)/index.tsx`
  - `mobile/app/view/[...path].tsx`
  - `mobile/components/FileAttachmentPicker.tsx`
  - `mobile/components/MessageBubble.tsx`
  - `mobile/components/editor/MarkdownEditor.tsx`
  - `mobile/__tests__/file-tree.test.ts`（新增）
  - `mobile/__tests__/markdown-styles.test.ts`（新增）
- 受影响的其他模块
  - `Files` 页本次不做大拆分，仅后续可继续复用 `file-tree.ts`
  - `useChat`、`sse-client` 本次不改逻辑
- 是否有破坏性变更
  - 无

## 边界 case 与风险
1. 空数组 / 空树输入
   - 处理：共享函数返回空数组 / `null`，不抛异常
2. 深层嵌套目录
   - 处理：递归保持与现有行为一致，测试覆盖多层树
3. 不同场景的 Markdown 样式差异
   - 处理：只抽共享基线，保留 `document` 和 `bubble` 两种变体
4. 风险：抽取后颜色/间距发生细微视觉变化
   - mitigation：保留现有视觉 token，不主动改风格
5. 风险：时间格式与现有页面不一致
   - mitigation：以 Home 当前实现为基线写测试，再复用

## 验收标准
- [ ] `flattenFiles` / `findNode` / 排序 / 相对时间逻辑从页面中抽离为共享领域模块
- [ ] `view/[...path].tsx`、`FileAttachmentPicker.tsx`、`index.tsx` 不再内嵌重复文件树逻辑
- [ ] `MessageBubble.tsx`、`MarkdownEditor.tsx`、`view/[...path].tsx` 复用共享 Markdown 样式模块
- [ ] 新增测试覆盖正常路径、边界 case、错误/回退路径
- [ ] `cd mobile && npm run typecheck` 通过
- [ ] `cd mobile && npx vitest run` 通过
- [ ] 不引入新的用户可见回归（列表、预览、聊天仍能正常工作）
