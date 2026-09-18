# dsh-client-ui-edit-resend

为 DSH 的用户消息加上「编辑」按钮：点一下，消息的文本和附件回填到输入框草稿，
改一改（可继续增删图片/附件）后照常发送，实现「编辑并重发」。

## 效果

- 每条持久的用户消息（排除 assistant 回合尾与 pending/echo）在复制键旁多一个铅笔图标按钮
- 点击后：消息文本经官方 `inputActions.setDraft` 回填进输入框并自动聚焦
- 消息里的图片/文件附件尽力重取（`session.readAttachment` → `conversation.createDrafts` → `addAttachments`）一并回填
- 发送走原生流程（输入框回车/发送键）

## 实现要点

- 纯浏览器端插件（ModuleLoader 单文件），无宿主侧逻辑
- 消息定位：DOM 中持久用户消息操作行的顺序 ↔ `hooks.chat` 快照里 kind 为 user/steering 的 input-message 节点顺序；失配时退化为气泡文本匹配
- 服务注入：`uiSession`（当前会话 binding）、`sessions`（附件字节读取）、`conversation`（草稿附件创建）、`locale`
- 不依赖任何构建期哈希类名：以复制按钮的 aria-label（中/英）为锚点注入

## 安装

已作为本地 `link:` 依赖装入 web profile（`~/.dsh/profiles/web/package.json` 的
dependencies 与 bundles）。插件目录在 `~/.dsh/local-plugins/`，不走 generations
内容寻址，插件市场操作不会覆盖。
