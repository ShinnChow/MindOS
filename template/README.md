# My Mind

个人知识操作系统，将工作流程、偏好和配置沉淀为可复用的文档，供 Agent 执行时直接引用。

## 🤖 Agent 使用指南

### 进入项目时

1. 先读取本文件（README.md），了解整体结构
2. 根据任务类型，进入对应目录读取相关 SOP
3. 执行环境配置类任务前，先读取 `Configurations/🧠 使用规范.md`

### 各目录适用任务

| 目录 | 适用任务 |
|------|----------|
| `Profile/` | 个人身份、偏好、目标与全局上下文 |
| `Configurations/` | 环境初始化、工具安装、Agent 配置 |
| `Workflows/Research/` | 文献调研、idea 生成、实验、论文写作与投稿 |
| `Workflows/Startup/` | 产品设计、技术开发、市场营销 |
| `Workflows/Media/` | 媒体内容创作 |
| `Workflows/Information/` | 信息获取与整理 |
| `Growth/` | 个人成长、学习规划 |
| `Resources/` | 外部资源收藏（GitHub 项目、工具、文章等）|

## 📁 目录结构

```
my-mind/
├── README.md
├── TODO.md
├── CHANGELOG.md
├── Profile/
├── Configurations/
├── Workflows/
├── Growth/
├── Resources/
└── Projects/
```

## 📐 扩展规范

### 新增文件

- 文件名以 emoji 开头，使用中文，英文专有名词保留原文
- 新增后必须同步更新所属目录的 `🧠 使用规范.md`

### 新增目录

- 目录名使用英文，体现领域或场景
- 在 README.md 目录结构和目录职责表中同步更新

### 添加产品

- 当用户提供一个产品时，抓取产品信息并追加一行到 `Resources/Products.csv`
- CSV 字段：`Name, URL, Category, Tags, Description, Key Features, Target Users, Pricing`

### 文件变更

- 文件重命名或移动后，更新所有引用该文件的地方
- `README.md` 是知识库总索引，目录结构变更必须同步更新

## 📝 格式规范

- 命令统一用 code 格式，独立执行的命令用 code block，行内提及用 `行内代码`
- 章节标题和关键条目适当添加 emoji
- 内容精炼，不啰嗦，面向执行而非解释
