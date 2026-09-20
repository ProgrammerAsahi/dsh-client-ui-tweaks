# HANDOFF — dsh-client-ui-tweaks 项目交接

> 写给下一段对话的 Kimi：读完这份文档 + `README.md` + `ISSUES.md` 即可上手。
> 本文档记录的是"为什么这么做"和踩过的坑；当前行为描述以 README 为准，待修问题以 ISSUES.md 为准。

## 项目身份

- **名字**：`dsh-client-ui-tweaks`（dsh 界面微调合集，本地自研，不走插件市场）。
- **源码位置**：`~/dsh-plugins/dsh-client-ui-tweaks`（用户其他插件项目也在 `~/dsh-plugins/`）。
- **曾用名/旧址**：`dsh-client-ui-edit-resend` @ `~/.dsh/local-plugins/`（2026-09-20 改名搬家，功能只含编辑重发时期的名字）。
- **装载方式**：`~/.dsh/profiles/web/package.json` 里 `"dsh-client-ui-tweaks": "link:~/dsh-plugins/dsh-client-ui-tweaks"` + `dsh.profile.bundles` 里一项 + `profiles/web/node_modules/dsh-client-ui-tweaks` 软链 + 插件自带 `cordis.patch.yml`（insert `{id: ui-tweaks}`）。
- **生效范围**：桌面版与本机网页版共用同一份 web profile 和家目录（`~/.dsh` 是指向 `~/Library/Application Support/dsh-desktop/harness` 的软链），一处注册两端生效。**VM 上的 dsh 网页版是独立实例，不受影响**（当初卸 dsh-ssh 时刻意保持的隔离）。
- **卸载**：删 profile 两行注册 + node_modules 软链 + 源码目录，无痕。

## 架构速览

- `index.js` = 宿主端（cordis 插件，inject `webServer`）：
  - `GET/POST /edit-resend-branches` — 分支族谱记录（`branches.json`）读写；GET 额外返回 `titles`（从会话日志流式扫描最后一条 `session/title` 事件，mtime 缓存）。
  - `POST /edit-resend-inbox` — 读子会话日志里最后一个 `turn/end` 之后经 next-turn splice 排队的消息。
  - 家目录定位：`~/.dsh` 优先，回退插件上两级（所以源码放哪都行）。
- `lib/client.js` = 浏览器端（`window.__ModuleLoader__.load` 单文件，inject `uiSession/sessions/conversation/locale/workspaces`）：编辑按钮注入、内联编辑框、乐观渲染、fork、队列清除、`‹ n/N ›` 箭头、侧栏家族归并、标题迁移。

## 硬知识（都是踩坑换来的，别重新踩）

1. **fork 锚点语义**：`sessions.fork({sessionId, atSeq, increaseTitle:false})` 的 atSeq 会解析为"≥该 seq 的第一个回合结束点"。要精确锚在**被编辑消息上一回合的 turn/end 的 seq**，否则会把被编辑消息/半成品回合包进分支。首条消息没有上一回合 → 走 `sessions.create({})` 空白会话。
2. **fork 会继承 next-turn 排队消息**：agent 打开分支会把继承的原问题重放重答。必须 open 前经 `/edit-resend-inbox` 读出继承项 id，`session.updateQueue(id, {kind:"remove"})` 移除。
3. **会话日志**：`~/.dsh/sessions/<工作区目录名>/<sessionId>/session.v3.jsonl.zstd`（zstd 压缩 JSONL；旧格式 `session.jsonl.zstd` 是 v0，多为子代理/旧会话）。标题事件是 `session/title`，最后一条为准；`rename` 以 `source.kind:"user"` 写入并**钉住**标题（压制自动标题）。
4. **标题懒加载陷阱**：`sessions.list.getSnapshot().byId[id].displayTitle` 在会话未打开过时**退化为 cwd 目录名**（title 投影未加载）——千万别拿它当真值用（曾把分支记录写成 "工作区目录名"）。真值从日志读（宿主端 `readSessionTitle`）；快照里 `summary.title` 是持久标题字段（可能 undefined），`displayTitle` 是计算值。
5. **侧栏行 DOM 不带 session id**：只有 `role="treeitem"`、`aria-selected`、标题文本、相对时间文本。行↔会话映射用 **(displayTitle, timeLabel(updatedAt)) 对**——`timeLabel` 分桶复刻自 `dsh-client-ui-primitives` 的 `relativeTime`（<1min 刚刚 / N分钟 / N小时 / N天 / N个月 / N年；en 版 now/min/h/d/mo/y）。
6. **运行状态**：侧栏蓝色"转圈"= `StateDot`（`data-state="ongoing"`，像素追逐动画），由 `summary.running` 驱动；`summary.completed` 是非选中会话跑完的绿色 done 点。家族里让"正在工作的成员自己的行"可见即可，不要自研。
7. **订阅而非轮询**：`ctx.uiSession.adapter.current.subscribe(fn)` 订阅当前会话切换；`ctx.sessions.list.subscribe(fn)` 订阅列表/标题/running 变化，都返回 unsubscribe。
8. **窗口 hidden 时 rAF 完全不触发**（Electron 节流）——注入调度必须有 `setTimeout` 兜底，否则后台窗口里按钮不出现。
9. **CSS 类名纪律**：不用完整哈希类名（`.YDXeBa_sessionRow` 这种会随构建变）；用结构性锚点（`role="treeitem"`、aria-label）+ CSS-module 本地名后缀（`[class*="_title"]`）。复制按钮锚点用中/英 aria-label。
10. **rename 前提**：`sessions.binding(id).session.rename(title)` 要求会话在列表快照里；宿主侧会自动 resume，不需要打开过。rename 后顶部标题（ConversationSessionHeader）与侧栏同步更新。
11. **zstd 依赖**：`/opt/homebrew/bin/zstd` 必须在 PATH。长会话日志解压后几十 MB，读标题用流式扫描（spawn + 逐行），别整个读进内存。

## 当前状态（2026-09-20）

- 功能全部实测通过：编辑内联框零副作用、发送才 fork、锚点精确、继承队列清除、`‹ n/N ›` 箭头、家族归根、侧栏单行归并、原生转圈、标题统一（无 (n) 编号）、切走切回落在最近活跃成员、窗口隐藏注入兜底。
- `branches.json` 现有 2 条**用户真实**分支记录（两个真实会话家族），勿删。
- 桌面版最后以无调试参数的干净方式重启。

## 已定方向 / 下一步（用户认可过，未动工）

- 新功能区（与编辑重发并列）：①侧栏无标题会话显示首条消息摘要（**纯展示层**，别替它写死标题）；②对话过程信息默认折叠/可展开。
- 代码结构：client.js 按 feature 分区，每区独立 try/catch 挂载，坏一个不拖垮其他。
- ISSUES.md 里 6 条待修（最高的：`sendEdited` 早退不释放全局锁）——用户说过"不急"，等他发话再修。

## 开发与验证 recipe

- **client.js 改动**：页面 reload 即生效（CDP 里 `location.reload()`）；**index.js 宿主端改动必须重启应用**。
- **CDP 验证**：`pkill -x "DSH Desktop"; open -a "DSH Desktop" --args --remote-debugging-port=9222`，页面目标在 `http://127.0.0.1:9222/json`，用 `Runtime.evaluate`（node ≥22 内置 WebSocket）。收尾记得 `pkill` 后 `open -a "DSH Desktop"`（不带 flag）干净重启。
- **测试会话纪律**：用一次性会话做端到端（发两条小消息 → 编辑第二条），测完走 UI 原生"删除会话"删掉父子 + 清 `branches.json` 记录；别动用户真实会话。应用重启会触发滑块哨兵自愈（`~/.dsh/local-bin/dsh-effort-slider-autofix.py`），属正常。

## 历史会话（要考古可以去挖）

- 功能诞生史：[ZCode] 配置大模型 turn 100+（`~/.kimi-code/sessions/（历史会话目录，略）`）——从"回填输入框"到 fork 分支到箭头切换到内联编辑的完整演进。
- UX 优化与改名轮：阅读插件代码与讨论（`~/.kimi-code/sessions/wd_dsh-client-ui-edit-resend_8ea770933c71/`，注意该工作目录已随搬家失效）。
