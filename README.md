# dsh-client-ui-tweaks

dsh 界面微调合集插件（本地自研，不走插件市场）。目前包含的功能区：

## 编辑重发（edit-resend）

- 每条持久的用户消息在复制键旁多一个铅笔按钮；点击后**原位**变成内联编辑框（预填原文，Enter 发送 / Esc 或红色取消键放弃，编辑期零副作用）
- 发送那一刻才 fork：在被编辑消息**上一回合的 turn/end** 处切出分支，编辑稿自动提交为分支的第一条新消息；首条消息没有上一回合，改走新建空白会话
- fork 会继承"next-turn 排队"的原消息导致重答——打开子会话前经宿主路由 `/edit-resend-inbox` 读出继承项并用 `updateQueue` 精准移除
- 被编辑消息下方出现 `‹ n/N ›` 箭头，在原版与各分支版之间切换；同一条消息的多次编辑归并到**根会话家族**（1/N…N/N）
- 发送瞬间乐观渲染（新泡泡 + 处理中动画），全局防连点锁

## 分支家族侧栏归并 + 标题统一

- 侧栏每个分支家族只保留一行可见：当前打开的成员 > 运行中 > 刚完成 > 最近更新；可见行就是工作现场本身，dsh 原生运行状态点（StateDot ongoing/done）自然出现
- 分支会话与父会话**同名**（rename 写 `session/title` 并钉住标题），顶部标题与侧栏一致
- 打开家族会话时自动落到 `updatedAt` 最新的成员（切走再切回 = 回到最近工作过的分支）；箭头切换走旁路
- 侧栏行通过 (displayTitle, timeLabel(updatedAt)) 对精确映射到会话（复刻 dsh 的相对时间分桶），冷启动标题退化为目录名时也可分

## 结构

```
├── index.js          # 宿主端：/edit-resend-branches（分支记录 + 日志标题真值）、/edit-resend-inbox（继承队列检查）
├── lib/client.js     # 浏览器端：全部交互（编辑按钮、内联编辑框、fork、队列清除、箭头、侧栏归并）
├── branches.json     # 分支族谱记录（持久化数据）
└── cordis.patch.yml  # 插件注册行
```

宿主端数据目录定位：优先 `~/.dsh`（桌面版与网页版共享家目录的软链），回退到插件上两级。

## 安装

源码放在 `~/dsh-plugins/dsh-client-ui-tweaks`（与其他插件项目同级），以绝对路径 `link:` 依赖
装入 web profile（`~/.dsh/profiles/web/package.json` 的 dependencies 与 bundles）。
桌面版与本机网页版共用同一份 profile 与家目录，一处注册两端生效；不走 generations
内容寻址，插件市场操作覆盖不到。卸载 = 删 profile 里的两行注册 + node_modules 软链 + 源码目录。

已知问题与修复记录见 [ISSUES.md](ISSUES.md)。
