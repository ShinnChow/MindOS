# MindOS 营销优化方案

*由 /ai-marketing-engine 生成 | 2026-03-27*

---

## Phase 1: Marketing Brief

| 项目 | 内容 |
|------|------|
| **Product** | MindOS |
| **One-liner** | 你思考的地方，AI 行动的起点。 |
| **Target audience** | 同时使用 3+ AI Agent 的独立开发者/创始人，管理复杂项目上下文 |
| **Core pain** | 每次换 Agent 都要从零交代背景，纠正和判断关掉对话就丢了 |
| **Solution promise** | 一次记录，所有 Agent 都能复用你的判断和项目记忆 |
| **Differentiator** | 不只是记忆——人可治理 + 判断沉淀为 Skill/SOP + 纯本地开源 |
| **Desired action** | npm install + GitHub star |
| **Tone** | 自信但不傲慢，技术但可感知，开发者友好 |
| **Framework** | **PAS**（问题明确且痛感强，适合 PAS） |

---

## Phase 2: Landing Page Copy（优化版）

### HERO

**Badge:** Where You Think, Agents Act

**Headline（现有）：** 让认知沉淀，让心手并进。

**Headline（建议 A）：** 别再给每个 Agent 重复交代背景了。

**Headline（建议 B）：** 你的判断值得被记住——不只是这一次对话。

在 AI 时代，心负责判断，手交给 Agent。MindOS 把你的判断、偏好和方法论沉淀成所有 Agent 都能复用的本地认知资产。

> **分析：** 现有 headline "让认知沉淀，让心手并进"是品牌 slogan，但不是转化 headline。它表达了愿景，但没有回答"这对我有什么用"。建议 A 直击痛点，建议 B 打情感牌。品牌 slogan 保留在 badge 或 subhead 中。

**Subhead（建议）：**
MindOS 是面向多 Agent 用户的本地知识库。写一次项目记忆和 SOP，Claude Code、Cursor、Gemini CLI 全都能读。不用搬运上下文，不用反复讲背景。

**CTA Primary:** `npm install -g @aspect/mindos` （直接给安装命令，开发者最爱）

**CTA Secondary:** Star on GitHub

**Trust Tags:** 开源 · 本地优先 · 兼容 10+ Agent · MCP 原生

---

### PROBLEM（PAS — Problem）

**现有问题：** 落地页的 Vision 段落讲"人机共享心智"——概念正确但太抽象。

**建议重写：**

> **你每天在重复做同一件蠢事。**
>
> 早上在 Claude Code 里交代项目背景。中午在 Cursor 里又讲一遍架构决策。下午换到 Gemini CLI，再把 SOP 粘贴一次。
>
> 你纠正了 AI 的一个错误判断——这个纠正关掉对话就消失了。
> 你总结了一套最佳实践——换个 Agent 又要从零开始。
>
> 你的判断在流失。每一次。

---

### AGITATE（PAS — Agitate）

> 更糟糕的是：你的 Agent 们各记各的。Claude 以为你喜欢 A 方案，Cursor 记住的是 B 方案，Gemini 什么都不记得。
>
> 你不是在用 AI 提升效率——你是在当 AI 的人肉上下文搬运工。
>
> 别人用 3 个 Agent 做 3 倍产出，你用 3 个 Agent 做 3 倍重复劳动。

---

### SOLUTION（PAS — Solution）

> **MindOS：写一次，所有 Agent 都记住。**
>
> 把你的项目记忆、SOP、偏好和判断写进 MindOS。通过 MCP 协议，每个 Agent 自动读取。
>
> - **统一记忆** — 一处记录，Claude Code / Cursor / Gemini CLI 全局复用
> - **透明审计** — Agent 读写全留痕，你随时审查和修正
> - **判断沉淀** — 纠正自动变成 Skill，下次 Agent 直接照做
>
> 不是给笔记加 AI。不是给 Agent 加记忆。
> 是让你的判断成为所有 Agent 的共享操作系统。

---

### HOW IT WORKS

> **Step 1:** `npm install -g @aspect/mindos && mindos onboard` — 30 秒完成安装
> **Step 2:** 把项目资料写进知识库（或一键导入现有项目）
> **Step 3:** 用 `mindos token` 连接你的 Agent — 它们立刻读到你的全部上下文

---

### SOCIAL PROOF（模板）

> "[具体引言]"
> — [姓名], [职位] @ [公司]
> **结果：** [具体数字，如"每天节省 30 分钟重复交代背景"]

> **建议收集方向：**
> - 内测群中找 2-3 个愿意给引言的用户
> - 重点量化"节省了多少重复交代时间"
> - 如果暂时没有，用"30 人内测中"或 GitHub stars 代替

---

### FAQ（伪装的反对意见处理）

**Q: 我已经用 Obsidian 管知识库了，为什么需要 MindOS？**
A: Obsidian 是给人读的。MindOS 是给人和 Agent 一起读的。你的 Agent 不会打开 Obsidian 查笔记——但它能通过 MCP 直接读取 MindOS 的知识库。

**Q: 和 Agent 自带的记忆功能有什么区别？**
A: Agent 记忆是每个工具各记各的，你看不到也改不了。MindOS 是统一的、你可以审查和修正的、所有 Agent 共享的。

**Q: 数据安全吗？**
A: 所有数据存在你的本地文件系统，纯 Markdown 文本。没有云端，没有遥测，没有锁定。你甚至可以用 Git 同步到自己的私有仓库。

**Q: 支持哪些 Agent？**
A: 所有支持 MCP 协议的 Agent：Claude Code、Cursor、Cline、Zed、Windsurf、Gemini CLI 等 10+。

**Q: 免费吗？**
A: 核心功能完全免费且开源（MIT）。未来的 Pro 版本增加 AI 增强功能（语义搜索、知识健康度分析），但本地存储和编辑永远免费。

**Q: 如果 MindOS 停了怎么办？**
A: 你的数据是纯 Markdown 文件，不依赖任何服务。MindOS 消失了，你的文件还在。零锁定。

---

### FINAL CTA

> **你的判断值得被记住。**
>
> 30 秒安装。本地运行。完全开源。
>
> `npm install -g @aspect/mindos`
>
> [Star on GitHub →]

---

## Phase 3: Audience Simulation

### Persona 1: The Skeptic（资深开发者，见过 100 个工具）

**First 5 seconds:** "又一个 AI 知识管理工具？"
**Reading the hero:** 如果看到"让认知沉淀，让心手并进"会直接关掉——太虚了。但如果看到"别再给每个 Agent 重复交代背景了"会停下来——这正是我每天的痛。
**Drop-off point:** 如果没看到具体的技术细节（MCP 怎么工作的、数据格式是什么），会在 Solution 段后离开。
**Conversion likelihood:** 6/10
**Biggest objection:** "这和我自己用 CLAUDE.md + .cursorrules 有什么区别？"
**Fix:** 增加一个"vs 手动管理"的对比段落，量化差异。

### Persona 2: The Busy Scanner（30 秒扫描）

**First 5 seconds:** 看 headline → 看 trust tags → 看 CTA
**Reading the hero:** "别再重复交代背景" — 懂了。"npm install" — 行，低成本试试。
**Drop-off point:** 如果 CTA 不够显眼或要注册/登录，直接走。
**Conversion likelihood:** 7/10（如果 headline 改了的话）
**Biggest objection:** "我现在就要用，别让我读一堆东西"
**Fix:** Hero CTA 直接给 `npm install` 命令，不要"Get Started"这种模糊按钮。

### Persona 3: The Comparison Shopper（已用 Obsidian + 插件）

**First 5 seconds:** "这和 Obsidian 有什么区别？"
**Reading the hero:** 如果没在前 3 屏看到对比，会自己去搜"MindOS vs Obsidian"
**Drop-off point:** FAQ 的 Obsidian 问题如果不够有力
**Conversion likelihood:** 4/10
**Biggest objection:** "我的 Obsidian vault 已经有 2000 个文件了，迁移成本太高"
**Fix:** 增加"从 Obsidian 迁移"的一键导入功能说明，降低感知迁移成本。

### Persona 4: The Technical Evaluator（要看架构）

**First 5 seconds:** 直接跳到技术细节或 GitHub
**Reading the hero:** 略过，直奔 How It Works 和 GitHub README
**Drop-off point:** 如果没有架构图或技术深度说明
**Conversion likelihood:** 8/10（如果 GitHub README 够好）
**Biggest objection:** "MCP 只有 Anthropic 在推，如果标准变了怎么办？"
**Fix:** 在技术段增加"MCP 兼容 + 协议抽象层"的说明。

### Persona 5: The First-Timer（从没听说过"多 Agent 上下文管理"）

**First 5 seconds:** "MindOS... Personal Context OS... 这是什么？"
**Reading the hero:** 如果 headline 是品牌 slogan，完全不懂。如果是"别再重复交代背景"，能共鸣但不确定自己是目标用户。
**Drop-off point:** 看到 "MCP 协议" "Skill/SOP" 等术语时
**Conversion likelihood:** 3/10
**Biggest objection:** "这是给什么人用的？我是吗？"
**Fix:** 在 Hero 下增加一行 "For developers who use Claude Code, Cursor, or Gemini CLI daily"，明确受众。

### Issues Found (by severity)

#### CRITICAL
1. **Hero headline 太抽象** — Skeptic, Scanner, First-Timer 都反映 → **改为痛点驱动的 headline**
2. **没有明确受众标识** — First-Timer 不知道自己是否是目标用户 → **增加 "For developers who..." 标识**

#### IMPORTANT
3. **缺少 vs 手动管理对比** — Skeptic 问 "和 CLAUDE.md 有什么区别" → **增加对比段**
4. **CTA 太模糊** — Scanner 想要直接 `npm install` → **CTA 改为安装命令**
5. **迁移成本恐惧** — Comparison Shopper 担心现有知识库 → **增加"一键导入"说明**

#### MINOR
6. **MCP 标准风险未 address** — Technical Evaluator 关心 → **技术段增加协议抽象说明**

---

## Phase 4: Optimization（已应用到 Phase 2 文案中）

上述 Phase 2 的文案已经整合了 Phase 3 模拟的修复建议：
- Hero headline 改为痛点驱动（建议 A/B）
- CTA 改为 `npm install` 命令
- PAS 框架重写 Problem/Agitate/Solution
- FAQ 处理了 Obsidian 对比、Agent 记忆对比、数据安全等

---

## Phase 5: Adversarial Review

### Pass 1: CRO 专家

| 检查项 | 现有落地页 | 优化版 | 状态 |
|--------|----------|--------|------|
| 5 秒内清楚价值？ | 否（品牌 slogan） | 是（痛点 headline） | 已修复 |
| CTA 明显？ | "Get Started" 模糊 | `npm install` 命令 | 已修复 |
| 有 dead zone？ | Vision 段太抽象 | PAS 结构有节奏 | 已修复 |
| Social proof 在 CTA 前？ | 无 social proof | 增加了模板 | 需用户填充 |
| 反对意见处理？ | 无 FAQ | 6 个 FAQ 覆盖主要反对 | 已修复 |
| 可扫描？ | 标题讲故事但不清晰 | 标题串起来就是完整故事 | 已修复 |

**剩余问题：** Social proof 是模板，需要真实用户引言才有效。

### Pass 2: 竞品视角（假设你是 MemOS）

> "MindOS 说它是 Personal Context OS，但本质上就是一个 Markdown 知识库加了个 MCP Server。我们 MemOS 有图数据库、有向量检索、有学术论文支撑。MindOS 连 RAG 都还没做。"

**防御改进：**
- 落地页不要回避"Markdown 文件"——把它变成优势："纯文本 = 零锁定 = 你永远拥有数据"
- 强调"人可治理"——MemOS 需要编程才能查看记忆，MindOS 用 GUI 直接编辑
- 强调"判断沉淀"——MemOS 只存储记忆，MindOS 把纠正变成 Skill

---

## Phase 6: 最终交付物清单

### 落地页文案改动建议

| 位置 | 现有 | 建议 | 优先级 |
|------|------|------|--------|
| Hero Headline | 让认知沉淀，让心手并进 | 别再给每个 Agent 重复交代背景了 | P0 |
| Hero Subhead | 品牌叙事 | 痛点+产品定义（见上文） | P0 |
| Hero CTA | Get Started | `npm install -g @aspect/mindos` | P0 |
| 受众标识 | 无 | "For developers using Claude Code, Cursor, or Gemini CLI" | P0 |
| Problem 段 | Vision "人机共享心智" | PAS 结构重写（见上文） | P1 |
| FAQ | 无 | 6 个 FAQ（见上文） | P1 |
| Social Proof | 无 | 收集 2-3 个内测用户引言 | P2 |

### A/B Test 变体

| 变体 | Headline | 预测效果 |
|------|---------|---------|
| A（痛点） | 别再给每个 Agent 重复交代背景了 | Scanner + Skeptic 友好，转化率高 |
| B（情感） | 你的判断值得被记住——不只是这一次对话 | First-Timer + 情感共鸣，品牌建设 |
| C（现有） | 让认知沉淀，让心手并进 | 品牌调性强，但转化弱 |

建议：A 作为默认，C 保留为 tagline/badge。

### 内容营销建议（下一步）

1. **首篇博客**："为什么我给 Claude Code 反复讲了 100 遍同样的背景"——痛点共鸣文
2. **Product Hunt launch post**：用 headline A + 30 秒 demo GIF
3. **Hacker News**："Show HN: MindOS – A local-first context layer for multi-agent workflows"
4. **即刻/小红书**：用中文 headline B + 场景截图

---

*本方案经过 5 persona 模拟 + CRO 专家审阅 + 竞品对抗审阅，共发现 6 个问题，已全部提供修复方案。*
