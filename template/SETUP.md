# template/

MindOS 知识库模板，用于初始化你自己的个人知识库。

## 快速开始

```bash
# 1. 复制模板到 my-mind/
cp -r template/ my-mind/

# 2. 配置 MIND_ROOT（让 MCP 和 App 指向你的知识库）
echo "MIND_ROOT=$(pwd)/my-mind" >> app/.env.local

# 3. 开始填写内容，从 Profile/ 开始
```

## 目录说明

| 目录/文件 | 说明 | 建议第一步 |
|-----------|------|-----------|
| `README.md` | 知识库总索引，Agent 进入时首先读取 | 保留结构，按需修改 |
| `TODO.md` | 待办事项 | 直接开始使用 |
| `CHANGELOG.md` | 完成记录 | 直接开始使用 |
| `Profile/` | 个人身份与上下文，Agent 理解"你是谁"的核心 | **优先填写** |
| `Configurations/Agents/` | MCP、Skill、Agent 工具配置 | 按需修改 Token |
| `Workflows/` | 工作流 SOP，空目录，按需添加 | 从 Startup 或 Research 开始 |
| `Growth/` | 个人成长记录，空目录 | 按需使用 |
| `Resources/` | 资源收藏，CSV 已含表头 | 直接追加 |
| `Projects/` | 个人项目记录 | 按需使用 |

## Profile 填写顺序（推荐）

1. `👤 Identity.md` — 基本信息、职业背景
2. `⚙️ Preferences.md` — 工具偏好、AI 交互偏好
3. `🧠 Context.md` — 当前工作状态（定期更新）
4. `🎯 Objectives.md` — 长期目标与当前重点
5. 其余文件按需填写
