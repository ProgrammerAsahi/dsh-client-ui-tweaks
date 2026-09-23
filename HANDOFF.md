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
12. **侧栏行 key 的分隔符是不可见字符 `\001`**（`` `${title}\001${time}` ``）——Read 工具把它显示成空格，按文本编辑该行会静默失配；改 key 构造必须两端一起改且保留 `\001`。
13. **compaction 事件族**：`compaction/start` → `compaction/prune`×N → `compaction/summary`（`data.summary` 数组 = dsh 自己模型生成的压缩前对话总结，markdown 结构，可直接当标题素材）→ `compaction/end`，同一轮用 `data.compactionId` 串联。UI 侧标志是对话区的 `[class*="_compactionRow"]`（含"已压缩 N 条历史记录"）；旧压缩行会随滚动懒渲染，触发判断要用"行数比打开时多"做基线 + 宿主端 `compaction/end.time` 3 分钟时间窗双保险。
14. **每回合日志里 `user/message` 有多条**：真人消息 `data.source.kind:"user"`，其余是 `agent-instructions`/`plugin`/`skill-catalog` 等注入（role 也是 user）。数"首条消息"必须按 kind 过滤，否则永远 >1。
15. **kimi-coding 模型调用**：endpoint `https://api.kimi.com/coding/v1/messages`，anthropic-messages 协议，`authorization: Bearer <access_token>`，模型 id `k3`，思考档 `thinking:{type:"adaptive"} + output_config:{effort:"low"}`（thinkingLevelMap 最低可用档是 low）。**`max_tokens` 别给 64**——adaptive thinking 的思考链也吃这个预算，偶发耗光会导致响应只有 thinking 块没有 text 块（表现为返回空）；512 稳妥。凭据在 `~/.kimi-code/credentials/kimi-code.json`（expires_in 900s，只读不刷新——见 AGENTS.md 约束 #9）。
16. **CDP 合成事件清不掉 React 控制的 composer**（selectAll/delete/Selection API 都会被 reconcile 回来）；要清空输入框得用 kimi-cu 的 `type_text` 带 `clear:true`（真实按键）。`/compact` 指令菜单同理：`button[role="option"]` 用合成 click 可以点中，但文本残留时菜单不弹——先清干净。

17. **侧栏行会被 React 整个换掉**（运行状态/时间标签/标题变化都触发重渲染）：附着在行上的 canvas/样式会随旧元素失联。特效类功能要每帧重新找行、重新挂靠、重新垫高/补模糊，并容忍行短暂缺失（~800ms）——别假设拿到的行元素是稳定的。另外**后台窗口 setTimeout 会节流到 ~1s**，基于 DOM 采样的测试观测会失真，验证特效要让窗口在前台。
18. **rename 的兜底链**：新会话的 `ctx.sessions.binding(id).session` 偶发未就绪（binding 有了 session 还没挂上），且 dsh 自己的 provider 自动标题（`kind:"provider"`）也在抢写。auto-title 的 rename 要"特效内重试（4×700ms）+ 特效后检查标题文本未变则直接补改（6×1s）"双保险，否则标题偶发落空。

19. **特效首帧自杀 bug（2026-09-23 修）**：`playTitleEffect` 的 master 包络 `Math.min(1, t/100)` 在 t=0 恰好为 0，被 `if (master <= 0)` 误判成"动画已结束"→ 首帧即 `canvas.remove()`，特效一帧都没播过。v3 重写时引入；当时验证走的是 `__previewFx` 调试钩子，真实触发路径从未跑通。修法：终止只看时间（`t > SWEEP+FADE`），包络抬成 `(t+FRAME)/100`。教训：**带淡入包络的动画，包络零点不能复用为终止条件**。

20. **kimi OAuth 的"天然新鲜"前提已失效（2026-09-22 mimo-migration）**：约束 #9 写的"用户发消息时 harness 自己就在调模型所以令牌新鲜"，前提是 `agent-default-model = kimi-coding/k3`（harness 调模型即刷 OAuth 文件）。9-22 换成 `xiaomi-token-plan-cn/mimo-v2.6-pro` 后 dsh 不再碰 kimi 凭据，令牌只在 Kimi Code 自己用时才刷新（15 分钟过期）→ auto-title 按旧设计会经常静默跳过。修法：出题走三档链（K3 新鲜才走 → MiMo-Flash → DeepSeek-Flash，后两档走 harness `llm` 服务，同通道同鉴权）。**验证凭据类"天然成立"的假设前，先确认刷凭据的那个进程真的在跑**。

21. **首条消息标题的归属（2026-09-23 定）**：dsh 内置 `session-title-first-prompt-llm`（`session/title` kind=provider，经 `ctx.sessionTitle.register` 注册，automatic=first-prompt）已在给首条消息写标题——用户拍板"直接用 dsh 的，我们自己就不做了"。我们的 `/auto-title` kind=first 只做三件事：等它落定（`since` 新鲜窗口防旧会话误触发）→ 收养进 `autotitle.json`（区分"我们认可的标题"与"用户手改"，防止显示兜底的 rename 写 kind=user 后被 compact 误判成钉住）→ 回报真值播特效。内置只有 first-prompt 档、没有 compact 档，compact 重标题仍是我们独有。

## 当前状态（2026-09-23，第六轮：特效修复 + 标题归属让位内置）

- 用户报"自动标题在起效但特效从不播出"。诊断出三层：①特效首帧自杀（#19）；②auto-title 链路自 9-22 起静默死亡（#20，autotitle.json 零写入为证）；③用户看到的"自动标题"其实是 dsh 内置 provider 写的（#21，title 事件 kind=provider/model=mimo-v2.6-pro），与我们的 K3 链路无关。
- 按用户拍板重做：首条标题全权让给内置（不生成不抢写，只保证显示 + 播特效）；compact 保留为插件独有，走三档链（K3-low → MiMo-V2.6-Flash → DeepSeek-V4.1-Flash）；特效双编排（我方写题=旧糊→扫光换题→新清；内置写题=新题糊→扫光→转清晰）。
- CDP 实测全绿：首条（内置落定 + 特效 10 帧渐隐 + 零糊残留 + autotitle 收养）→ compact（三档链实测落在 MiMo-Flash 档 + full 编排 + rename 落成）→ 手动改名后 compact（`skip:user-pinned` 10ms 拒绝、不播不覆盖）→ edit-resend 四项回归（fork/箭头 ‹2/2›/家族单行/无重放）→ 路由 200/404/405/400。
- 测试会话（用户手动改名测试 父+fork 子）已 UI 原生删除 + 磁盘空壳清净；autotitle.json 回到用户 2 条、branches.json 回到 3 条真实记录。
- 桌面版带 CDP 留观中（本轮验证用）；最终以无调试参数干净重启。

## 当前状态（2026-09-21，第五轮：特效定稿为像素微光）

- 特效按用户反馈定稿：**透明像素格底纹 + 暗蓝微光右→左闪过 + 光到之处格子温和凸起（人浪收敛版）+ 标题模糊→清晰换题**（rename 编排进特效时序）。帧捕获确认光带右→左移动、凸起、渐隐；换题编排实测（旧题模糊时 rename、新题落定后清晰）。
- 关键教训写成硬知识 #17-#18（React 换行要每帧重挂；rename 双保险兜底链）。
- 功能本体（首消息/compact 触发、守卫、宿主路由）经多轮回归稳定；用户已在真实使用（自述"该出的标题都出了"，且真实分支记录 +1）。
- `branches.json` 3 条**真实**记录（用户自己在用 edit-resend，勿动）；`autotitle.json` 只留用户两条（自我介绍请求、助手自我介绍）。
- 桌面版最后以无调试参数的干净方式重启。

## 历史快照（2026-09-21，第四轮：特效迭代为像素海水）

- 海浪特效按用户反馈重做：深海配色 + 右端灌入/左端排出 + 水垫在标题文字下（洗掉附着露出标题，不挡字）；像素格固定 2px 对齐 StateDot，配色抄活体 StateDot 深蓝（泡沫本色、水体 ×0.22 档、水底 ×0.12 档）。CDP 帧捕获验证：右贴→注满→左贴，标题在注满时清晰可读。（第五轮已被像素微光方案取代）
- 验证时踩到的点：`autotitle.json` 重置为空后，老会话日志里的插件标题（user kind）会被钉住保护当成用户标题跳过——属预期行为，验证要开新会话；`Page.captureScreenshot` 在页面繁忙时会挂，帧捕获走 canvas `toDataURL` 更稳。

## 历史快照（2026-09-20，第三轮：auto-title 上线）

- 新功能**自动总结标题 + 像素海浪**全链路实测通过（CDP + 一次性会话，均已删净）：
  - 首条消息 → K3 总结标题（"给我三个提高工作效率的小技巧" → "提高生产力的三个技巧"）+ 海浪 ✓
  - `/compact` → 整段对话总结标题 + 第二次海浪 ✓
  - 手动改名后再 compact → 宿主返回 `skip:"user-pinned"`，标题不动 ✓
- 踩坑记录见硬知识 #13-#16（compaction 事件族、user/message 注入多写、max_tokens 陷阱、React composer 清空）。
- 上一轮的 ISSUES 修复（#1-#5 修复、#6 缓解）本轮回归未受影响（侧栏家族归并实测正常）。
- `branches.json` 2 条真实记录未动；`autotitle.json` 已重置为空（测试记录随会话删除）。
- 桌面版最后以无调试参数的干净方式重启。

## 历史快照（2026-09-20 第二轮：ISSUES 修复）

- 全天两轮 CDP 端到端实测通过：fork 编辑（会话中途消息）+ create 编辑（首条消息）双流程，编辑内联框、锚点精确、继承队列按 id 清除无重放、`‹ n/N ›` 箭头双向切换、家族侧栏单行、标题统一、宿主路由 200/404 语义。
- ISSUES 原 6 条待修已处理：#1-#5 修复（锁释放、日志名候选+404、队列清除改 id 精准匹配、purge 不碰用户新排、locateNode 弃索引回退），#6 加选中态偏好缓解、残余风险留档。
- `/edit-resend-inbox` 新语义：日志缺失 404（客户端重试）、日志在但没排队项 200 空数组（客户端即停，省 2s 轮询）；inbox 彻底读不出时 purge 退化全量清理兜底。
- `branches.json` 现有 2 条**用户真实**分支记录（两个真实会话家族），勿删；测试记录已随清理移除。
- 桌面版最后以无调试参数的干净方式重启。

## 已定方向 / 下一步（用户认可过，未动工）

- ~~新功能区①：侧栏无标题会话显示首条消息摘要（纯展示层）~~ → 已由 auto-title 替代（2026-09-20 第三轮上线：直接写 K3 总结标题，比纯展示层更进一步）；②对话过程信息默认折叠/可展开，未动工。
- 代码结构：client.js 按 feature 分区，每区独立 try/catch 挂载，坏一个不拖垮其他。
- ~~ISSUES.md 里 6 条待修~~ → 2026-09-20 已全部处理（见 ISSUES.md 已修复）。

## 开发与验证 recipe

- **client.js 改动**：页面 reload 即生效（CDP 里 `location.reload()`）；**index.js 宿主端改动必须重启应用**。
- **CDP 验证**：`pkill -x "DSH Desktop"; open -a "DSH Desktop" --args --remote-debugging-port=9222`，页面目标在 `http://127.0.0.1:9222/json`，用 `Runtime.evaluate`（node ≥22 内置 WebSocket）。收尾记得 `pkill` 后 `open -a "DSH Desktop"`（不带 flag）干净重启。
- **测试会话纪律**：用一次性会话做端到端（发两条小消息 → 编辑第二条），测完走 UI 原生"删除会话"删掉父子 + 清 `branches.json` 记录；别动用户真实会话。应用重启会触发滑块哨兵自愈（`~/.dsh/local-bin/dsh-effort-slider-autofix.py`），属正常。

## 历史会话（要考古可以去挖）

- 功能诞生史：[ZCode] 配置大模型 turn 100+（`~/.kimi-code/sessions/（历史会话目录，略）`）——从"回填输入框"到 fork 分支到箭头切换到内联编辑的完整演进。
- UX 优化与改名轮：阅读插件代码与讨论（`~/.kimi-code/sessions/wd_dsh-client-ui-edit-resend_8ea770933c71/`，注意该工作目录已随搬家失效）。
