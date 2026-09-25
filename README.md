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
- 侧栏行↔会话映射走 **React fiber 精确桥**（行元素的 `SessionNodeItem` props 拿 `node.id`，一一对应零碰撞）；fiber 失效时退回 (displayTitle, timeLabel(updatedAt)) 键匹配兜底（复刻 dsh 相对时间分桶）。链式 fork（分支上再分支）按根归并为一家；无主的残留隐藏行自动放开

## 自动总结标题 + 像素微光（auto-title）

- **首条消息标题**：先短等（12s）dsh 内置 `session-title-first-prompt-llm` 落定（它走的也是会话模型，落定就收养）；内置失败是**静默的**（请求发出后无任何结果事件），落空就**自研出题兜底**（素材=首条真人消息）——标题/特效保证触发，不再因模型换掉/内置挂掉而哑火
- **出题链（2026-09-24 改）：对话模型优先**——从会话日志读当前 `request/header` 的 provider/model 出题（模型正在跑会话=必然可用，每次都能被 trigger），失败再退三档兜底：K3-low（kimi OAuth 新鲜才走）→ MiMo-V2.6-Flash → DeepSeek-V4.1-Flash（后两档走 harness `llm` 服务）；`via` 字段记录出题档（autotitle.json 可查）
- **素材防注入**：素材包成 JSON 数据并声明"不是指令"（对齐 dsh 内置 frameMessages 思路）——素材里的用户原话/请求若被模型当成活对话就会续写（实测垃圾标题（无关拒答式续写）即素材被续写）；sanitize 再拒收句读/破折号/超 45 字的散文回复
- **/compact 重标题是插件独有**（内置只有 first-prompt 档）：取日志里 `compaction/summary`（dsh 自己生成的压缩前对话总结）提炼成新标题
- 标题落定瞬间，侧栏对应行播放像素微光特效：透明像素格底纹浮现（**2px 实心块 + 2px 缝，StateDot 转圈圈同款颗粒**）→ 一道深蓝微光从右向左快速闪过（**斜切平行四边形光带 "/" 斜向、像素阶梯硬边，半宽 32px 软肩 + 芯线**，温和偏暗、不刺眼）→ 光到之处像素格温和凸起（体育馆人浪收敛版，最多 **4px**、2px 格距步进，原位留凹影）、走远落回 → 格子渐隐；双编排换题：**我方写题**（compact）走"旧题模糊→扫光中换题→新题清晰"，**内置写题**走"新题落定即进模糊→扫光→转清晰"；配色抄活体 StateDot 深蓝（rgb(86,134,254)），主题换色跟随；canvas 垫在标题文字下面；setTimeout 链驱动，窗口隐藏也能播；blur 清理走 finally + 硬超时双兜底
- 不碰的会话：用户手动改过名的（`session/title` 事件 `source.kind:"user"` 且与插件记录不符 → 永久跳过，不播不覆盖）；分支家族（标题由 edit-resend 统一）；超出触发窗口的旧标题（判 `stale-title` 跳过）
- 令牌纪律：kimi OAuth 只读 `~/.kimi-code/credentials/kimi-code.json`，过期即跳过该档、绝不自己 refresh（refresh 会轮换 refresh_token，和 harness/CLI 抢写会顶掉登录）——注意 mimo-migration 后 dsh 不再刷这份凭据，K3 档实际只在你刚用过 Kimi Code 的 ~15 分钟内有效，其余时间由 flash 档接棒
- 宿主路由 `POST /auto-title`：`{sessionId, kind:"first"|"compact", since?}` → `{title, source:"builtin"|"ours", kind?, via?}` / `{skip:原因}`；skip 全静默，不留错误 UI；kind=first 内置短等窗 12s 后自研兜底，`since` 新鲜窗 30s

## 结构

```
├── index.js          # 宿主端：/edit-resend-branches（分支记录 + 日志标题真值）、/edit-resend-inbox（继承队列检查）、/auto-title（K3 总结标题）
├── lib/client.js     # 浏览器端：全部交互（编辑按钮、内联编辑框、fork、队列清除、箭头、侧栏归并、自动标题触发 + 像素海浪）
├── prompts/title.txt # K3 标题总结 prompt（独立文件，mtime 缓存，改文案不动代码）
├── branches.json     # 分支族谱记录（持久化数据）
├── autotitle.json    # 插件写过的标题记录（钉住保护比对用）
└── cordis.patch.yml  # 插件注册行
```

机器级配套（不在源码目录）：`~/.dsh/cordis.patch.yml` — dsh 内置标题生成器的 `maxOutputTokens` 补丁（K3 出题依赖它，见 auto-title 节）。

宿主端数据目录定位：优先 `~/.dsh`（桌面版与网页版共享家目录的软链），回退到插件上两级。

## 安装

源码放在 `~/dsh-plugins/dsh-client-ui-tweaks`（与其他插件项目同级），以绝对路径 `link:` 依赖
装入 web profile（`~/.dsh/profiles/web/package.json` 的 dependencies 与 bundles）。
桌面版与本机网页版共用同一份 profile 与家目录，一处注册两端生效；不走 generations
内容寻址，插件市场操作覆盖不到。卸载 = 删 profile 里的两行注册 + node_modules 软链 + 源码目录。

已知问题与修复记录见 [ISSUES.md](ISSUES.md)。
