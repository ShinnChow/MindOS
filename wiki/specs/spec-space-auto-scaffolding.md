# Spec: Space 自动脚手架 (Auto-Scaffolding for Top-Level Directories)

## 目标

用户在知识库中创建新的一级目录（Space）时，自动生成 `INSTRUCTION.md` + `README.md`，保证 Agent 在任何 Space 中都能正确 bootstrap，消除"模板预置 Space 有引导文件，用户自建 Space 没有"的体验断裂。

## 现状分析

### 知识库目录体系

MindOS 知识库的一级目录是用户的 **Space**（如 Profile、Notes、Workflows），每个 Space 通过两个文件引导 Agent 行为：

| 文件 | 作用 | 来源 |
|------|------|------|
| `INSTRUCTION.md` | Agent 在此目录的执行规则（bootstrap 第 5 步读取） | 模板预置 |
| `README.md` | 目录导航、结构说明 | 模板预置 |

### 问题

1. **模板 Space 有，自建 Space 没有**：en 模板预置 6 个 Space（Profile/Notes/Connections/Workflows/Resources/Projects），每个都有 `INSTRUCTION.md` + `README.md`。用户自建的目录（如 `Learning/`、`Investments/`）什么都没有
2. **Agent 行为降级**：`/api/bootstrap?target_dir=Learning` 返回 `target_instruction: undefined`，Agent 失去目录级引导，只靠根 INSTRUCTION 的通用规则工作
3. **用户不知道需要这些文件**：INSTRUCTION.md 是 MindOS 独特的 Agent 协议文件，用户不会主动创建
4. **根 README.md 不同步**：新 Space 不在导航索引里（违反 INSTRUCTION.md §5.1："Add/delete/rename first-level directory: update root README.md"）

### 触发场景

用户创建一级目录的三条路径：

| 路径 | 触发方式 | 当前行为 |
|------|---------|---------|
| **MCP Agent** | `create_file("Learning/note.md", ...)` → `mkdirSync` 隐式创建父目录 | 只创建文件，不创建脚手架 |
| **Web API** | `POST /api/file { op: "create_file", path: "Learning/note.md" }` | 同上 |
| **Agent 工具** | App 内 `create_file` tool（同一个 `createFile` 函数） | 同上 |

三条路径最终都调用 `fs-ops.ts` 的 `createFile()` 或 `writeFile()`，其中 `mkdirSync(dir, { recursive: true })` 隐式创建目录。

## 数据流 / 状态流

```
用户/Agent 创建文件 "Learning/note.md"
  │
  ├─ fs-ops.ts: createFile() / writeFile()
  │   └─ mkdirSync("Learning/", { recursive: true })  ← 目录可能是新建的
  │
  ├─ 【新增】scaffoldIfNewSpace(mindRoot, filePath)
  │   ├─ 解析一级目录名："Learning"
  │   ├─ 检查：该目录是否刚被创建？（之前不存在 or 没有 INSTRUCTION.md）
  │   │
  │   ├─ 是 → 生成脚手架
  │   │   ├─ 写入 Learning/INSTRUCTION.md（通用模板，目录名替换）
  │   │   ├─ 写入 Learning/README.md（骨架，含目录名 + 空结构）
  │   │   └─ 追加根 README.md 的结构树（如果尚未包含该目录）
  │   │
  │   └─ 否 → 跳过（幂等）
  │
  └─ 返回原始结果（对调用方透明）
```

**关键设计**：脚手架逻辑是 **后置 hook**，不改变 `createFile`/`writeFile` 的接口和返回值，对所有调用方透明。

## 方案

### 核心：`scaffoldSpace()` 函数

```typescript
// lib/core/space-scaffold.ts

import fs from 'fs';
import path from 'path';

const INSTRUCTION_TEMPLATE = (dirName: string) => `# ${dirName} Instruction Set

## Goal

- Define local execution rules for this directory.

## Local Rules

- Read root \`INSTRUCTION.md\` first.
- Then read this directory \`README.md\` for navigation.
- Keep edits minimal, structured, and traceable.

## Execution Order

1. Root \`INSTRUCTION.md\`
2. This directory \`INSTRUCTION.md\`
3. This directory \`README.md\` and target files

## Boundary

- Root rules win on conflict.
`;

const README_TEMPLATE = (dirName: string) => `# ${dirName}

## 📁 Structure

\`\`\`bash
${dirName}/
├── INSTRUCTION.md
├── README.md
└── (your files here)
\`\`\`

## 💡 Usage

(Describe the purpose and usage of this space.)
`;

/**
 * If filePath is inside a top-level directory that lacks INSTRUCTION.md,
 * auto-generate scaffolding files.
 *
 * - Idempotent: won't overwrite existing files
 * - Only acts on first-level directories (direct children of mindRoot)
 * - Also appends the new directory to root README.md structure tree
 */
export function scaffoldIfNewSpace(mindRoot: string, filePath: string): void {
  // Extract first-level directory
  const parts = filePath.split('/').filter(Boolean);
  if (parts.length < 2) return; // file at root level, not a Space

  const topDir = parts[0];

  // Skip system directories
  if (topDir.startsWith('.')) return;

  const topDirAbs = path.join(mindRoot, topDir);
  const instructionPath = path.join(topDirAbs, 'INSTRUCTION.md');
  const readmePath = path.join(topDirAbs, 'README.md');

  // Already has INSTRUCTION.md → not a new Space
  if (fs.existsSync(instructionPath)) return;

  // Strip emoji prefix for template content (e.g., "📝 Notes" → "Notes")
  const cleanName = topDir.replace(/^[\p{Emoji}\p{Emoji_Presentation}\s]+/u, '') || topDir;

  // Generate scaffolding
  fs.writeFileSync(instructionPath, INSTRUCTION_TEMPLATE(cleanName), 'utf-8');
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, README_TEMPLATE(cleanName), 'utf-8');
  }

  // Append to root README.md structure tree
  appendToRootReadme(mindRoot, topDir);
}

function appendToRootReadme(mindRoot: string, dirName: string): void {
  const readmePath = path.join(mindRoot, 'README.md');
  if (!fs.existsSync(readmePath)) return;

  const content = fs.readFileSync(readmePath, 'utf-8');

  // Check if already listed
  if (content.includes(dirName + '/')) return;

  // Find the structure block and append before closing ```
  const structureEnd = content.lastIndexOf('└──');
  if (structureEnd === -1) return; // no structure block found

  const insertPos = content.indexOf('\n', structureEnd);
  if (insertPos === -1) return;

  const newLine = `├── ${dirName}/\n`;
  // Replace the last └── with ├── and add new └──
  const updated = content.slice(0, structureEnd)
    + content.slice(structureEnd).replace('└──', '├──')
    .replace(/\n```/, `\n└── ${dirName}/\n\`\`\``);

  fs.writeFileSync(readmePath, updated, 'utf-8');
}
```

### 集成点：`fs-ops.ts`

在 `createFile` 和 `writeFile` 中调用脚手架 hook：

```typescript
// fs-ops.ts — createFile()
export function createFile(mindRoot: string, filePath: string, initialContent = ''): void {
  const resolved = resolveSafe(mindRoot, filePath);
  if (fs.existsSync(resolved)) {
    throw new MindOSError(ErrorCodes.FILE_ALREADY_EXISTS, ...);
  }
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, initialContent, 'utf-8');
  scaffoldIfNewSpace(mindRoot, filePath);  // ← 新增
}

// fs-ops.ts — writeFile()（处理 Agent 直接写新路径的场景）
export function writeFile(mindRoot: string, filePath: string, content: string): void {
  const resolved = resolveSafe(mindRoot, filePath);
  const dirExisted = fs.existsSync(path.dirname(resolved)); // ← 新增：记录目录是否已存在
  const dir = path.dirname(resolved);
  const tmp = path.join(dir, `.tmp-${Date.now()}-${path.basename(resolved)}`);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmp, content, 'utf-8');
    fs.renameSync(tmp, resolved);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
  if (!dirExisted) scaffoldIfNewSpace(mindRoot, filePath);  // ← 新增：仅新目录触发
}
```

### 不做什么（显式排除）

| 排除项 | 原因 |
|--------|------|
| **AI 生成 README 内容** | 依赖 API Key，不可靠；通用模板够用 |
| **Space 管理 UI** | 过度设计，当前一级目录数量少（6-10 个），不需要专门界面 |
| **二级目录脚手架** | INSTRUCTION.md §3 明确说"Create it only when local rules are reusable and meaningful. Avoid creating them by default"，二级目录不应默认创建 |
| **用户确认弹窗** | 脚手架文件是辅助性的，不影响用户操作，静默创建最自然 |
| **i18n 模板内容** | 检测语言（en/zh）来生成对应语言的模板增加复杂度。先用英文模板（通用），用户可自行修改 |

## 影响范围

### 新增

| 文件 | 说明 |
|------|------|
| `app/lib/core/space-scaffold.ts` | `scaffoldIfNewSpace()` + 模板常量 + `appendToRootReadme()` |
| `app/__tests__/core/space-scaffold.test.ts` | 单元测试 |

### 修改

| 文件 | 改动 |
|------|------|
| `app/lib/core/fs-ops.ts` | `createFile()` 和 `writeFile()` 末尾各加 1 行调用 |

### 不改动

| 文件 | 原因 |
|------|------|
| `app/lib/agent/tools.ts` | 工具层不需要改，脚手架在 fs-ops 层自动触发 |
| `app/app/api/file/route.ts` | API 层不需要改，调用链自动生效 |
| MCP Server | MCP 调用 core 的同一套 fs 函数，自动生效 |
| 模板文件 (`templates/`) | 模板已有的 Space 不受影响（幂等检查） |
| 前端 UI | 无 UI 变更 |

## 边界 case 与风险

| # | 场景 | 处理 |
|---|------|------|
| 1 | 用户创建 `Learning/sub/deep/file.md`（多级嵌套） | 只取第一级 `Learning/`，只为一级目录创建脚手架 |
| 2 | 用户创建根级文件 `notes.md` | `parts.length < 2`，跳过 |
| 3 | 隐藏目录 `.agents/skills/xxx.md` | `topDir.startsWith('.')` → 跳过 |
| 4 | 已有 INSTRUCTION.md 的目录再创建文件 | `fs.existsSync(instructionPath)` → 跳过（幂等） |
| 5 | 已有 README.md 但无 INSTRUCTION.md | 只创建 INSTRUCTION.md，保留用户已有的 README |
| 6 | 根 README.md 不存在 | `appendToRootReadme` 静默返回 |
| 7 | 根 README.md 中没有结构树块 | `structureEnd === -1` → 跳过追加 |
| 8 | emoji 目录名（如 `📖 Learning/`） | 用正则剥离 emoji 前缀作为模板标题 |
| 9 | 并发创建同目录下多个文件 | `writeFileSync` 是同步操作，Node 单线程，无竞态 |
| 10 | 脚手架写入失败（磁盘满等） | try-catch 包裹，失败不影响主文件创建（用户操作优先） |

### 风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| 脚手架失败拖慢文件创建 | 低 | 两次 `writeFileSync`（<1ms），且 try-catch 不阻塞 |
| 用户不想要 INSTRUCTION.md | 低 | 删掉即可，且该文件对用户无副作用（只有 Agent 读） |
| 根 README.md 被错误修改 | 低 | 只追加目录行，不修改已有内容；有结构检测保护 |

## 验收标准

- [ ] Agent 调用 `create_file("Learning/note.md", ...)` → `Learning/INSTRUCTION.md` 和 `Learning/README.md` 自动出现
- [ ] Web API `POST /api/file { op: "create_file", path: "NewSpace/file.md" }` → 同上
- [ ] `writeFile("NewSpace/file.md", ...)` 写入新目录 → 同上
- [ ] 已有 INSTRUCTION.md 的目录不会被覆盖（幂等）
- [ ] 已有 README.md 的目录只补 INSTRUCTION.md
- [ ] 根级文件创建不触发脚手架
- [ ] `.agents/` 等隐藏目录不触发脚手架
- [ ] 新目录追加到根 README.md 结构树
- [ ] 脚手架失败不阻塞主文件创建
- [ ] 单元测试覆盖以上所有 case
