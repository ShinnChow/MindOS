# Linux.do 发帖（2026-03-24）

> 场景：Linux.do 社区首帖，技术向+个人感受，不做软文

---

## 标题

同时用 5 个 AI Agent，上下文搬运快把我逼疯了，所以写了个开源工具

## 正文

```
每天的工作流大概是这样：Claude Code 写代码，Cursor 改 bug，ChatGPT 查资料，Gemini 做调研，偶尔还开个 OpenClaw 跑自动化。

然后就一直在做一件蠢事——把上下文从一个窗口搬到另一个窗口。跟 Claude 聊了半小时的方案，切到 Cursor 又得重新讲一遍。好不容易踩坑踩出来的经验，关掉窗口就没了。

你们应该也有类似的感受？反正我看大家都在 CLAUDE.md、.cursorrules、.windsurfrules 里各写各的，格式不通，互相也读不了。

忍了一段时间之后写了 MindOS，开源的，MIT。干的事情就是让所有 Agent 共享同一份本地知识库。

原理不复杂：通过 MCP 协议，Claude Code、Cursor、OpenClaw 读写你本地的 Markdown 文件。数据在你电脑上，Git 管版本，人和 AI 的每次编辑都有记录。AI 读写日志在 GUI 的 Agent Inspector 里能看到，想审计随时看。

说几个我自己用着觉得还行的点：

笔记就是指令——写的 SOP、工作流、个人偏好，AI 直接能读懂和执行，不用转格式。mindos token 跑一下就能生成 Agent 配置，粘到 Claude Code 或 Cursor 里就连上了。对话里踩出来的经验可以存成 Skill，下次新对话直接用。桌面端也刚出了，macOS / Windows / Linux 都有。

安装：
npm i -g @geminilight/mindos && mindos onboard

技术栈 Next.js 16 + TipTap + MCP SDK，stdio 和 HTTP 两种传输，20 多个 MCP 工具，11 个渲染器（TODO Board、CSV Views、Wiki Graph 这些）。翻 GitHub 能看到更多。

---

多说两句不太技术的。

一开始就是烦上下文搬运，想解决这个具体问题。做了一阵之后发现市面上做 AI 记忆的产品方向我不太认同——笔记工具加 AI 插件，人写半天 AI 执行不了；AI 自己记的那种，记了啥你看不见，全在向量库里。

我比较想要的是：纠正了 AI 一个错，这个纠正留下来，AI 下次不犯，我自己的思路也跟着清楚一点。

还有就是这两年身边不少人对 AI 焦虑，怕自己越来越不爱动脑子。我有时候也这样。MindOS 有个我比较在意的点：人该花时间想清楚问题、做判断、攒认知，跑腿的事交给 Agent。

Human Thinks Here, Agents Act There.

---

现在 v0.5.9，迭代了 6 个大版本。macOS / Windows / Linux 桌面端 + CLI + Web GUI，本地优先不依赖云端，Git 自动同步。

还挺早期的，粗糙的地方不少。有 bug 或者想法直接提 issue，我回复挺快的。

GitHub：https://github.com/GeminiLight/MindOS
官网：https://tianfuwang.tech/MindOS

觉得有意思帮点个 Star，谢了。
```

---

## 发帖注意

- 分类选"分享创造"或"开发调优"
- 不要加任何 emoji 标题
- 如果有人问技术细节，认真回复，这是最好的推广
- 如果有人质疑，诚实回应，不要防御性辩解
- 前几个回复很关键，决定帖子能不能上热门
