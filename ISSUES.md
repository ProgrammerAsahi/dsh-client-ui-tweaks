# 已知问题记录

体检与 UX 优化中发现的隐患。**未标记的均为待修复**，等功能稳定后统一处理。

## 待修复

（无——2026-09-23 复查：特效不出/标题链路失效问题已在第六轮修复，见已修复区）

### 1. 侧栏行映射的残余碰撞面（低优先级，2026-09-20 已缓解）

- 位置：`lib/client.js` `syncBranchRows` / `sessionRowsByKey`。
- 现状：侧栏行通过 (displayTitle, timeLabel(updatedAt)) 对精确映射到家族成员，冷启动标题退化为 cwd 名时也可分；撞 key 时优先认领"选中态 == 是否当前会话"的行。
- 残余风险：同工作区、同 cwd 退化名、且 updatedAt 落在同一时间桶的无标题会话仍可能撞 key，导致非家族行被误归并。概率低，自愈于下一次同步。
- 另：选择器 `[class*="_title"]/[_time]` 依赖 CSS-module 的本地名后缀（比完整哈希类名稳定，但非零风险）；`role="treeitem"` 是结构性锚点，较稳。
- 注意：行 key 的分隔符是不可见字符 `\001`（Read 工具显示为空格）——编辑 key 构造行时别把它改成普通空格，两端必须一致。

## 已修复

- ~~像素感几乎不可见（用户："像素这块几乎感觉不到"）~~ → 2026-09-23：三层透明度全压鬼影档（格纹 0.16/光带 0.18/凸起≤2px）+ 颗粒 3px 块 1px 缝（空隙率 25%）糊掉格纹。改 2px 块/2px 缝（StateDot 同款）、格纹 0.34、光柱 0.42+芯线 0.62、凸起格点亮 0.3~0.8 且原位凹影；量化验收 maxA 46→243、meanA 40→100（详见 HANDOFF #22）。

- ~~像素微光特效从不播出~~ → 2026-09-23：根因 `playTitleEffect` 首帧自杀——master 包络 `Math.min(1,t/100)` 在 t=0 为 0 被当成"动画已结束"，首帧即 `canvas.remove()`。终止改按时间（`t > SWEEP+FADE`）、包络抬成 `(t+FRAME)/100`；blur 清理补 finally + 硬超时双兜底。CDP 帧采样确认 10 帧完整播出渐隐。
- ~~auto-title 链路静默死亡（9-22 起零产出）~~ → 2026-09-23：kimi OAuth 在 mimo-migration 后无人刷新、15 分钟即过期，旧设计只认 K3 直连 → 一直 `token-stale` 静默跳过。出题改三档链：K3-low（新鲜才走）→ MiMo-V2.6-Flash → DeepSeek-V4.1-Flash（走 harness `llm` 服务）；实测 K3 过期时 MiMo-Flash 无缝接棒。
- ~~首条消息标题归属混乱（与 dsh 内置抢写/双写）~~ → 2026-09-23：首条标题全权让给内置 `session-title-first-prompt-llm`（用户拍板），插件只等落定、收养进 autotitle.json、播特效 + 显示兜底 rename；compact 重标题仍为插件独有。

- ~~`sendEdited` 早退不释放全局锁~~ → 2026-09-20：`seq` 非数字的早退分支补齐 `clearOptimistic(row)` + `sendInFlight = false`，与同类失败分支一致。
- ~~`findSessionLog` 只认 `session.v3.jsonl.zstd`~~ → 2026-09-20：候选名 v3 + v0 旧名，再兜底目录内最新 `.jsonl.zstd`；日志缺失时 `/edit-resend-inbox` 返回 404（区别于"没排队项"的 200 空数组）；客户端 404 重试、200 空即停（无继承项时省掉 2s 轮询）。
- ~~继承队列清除的文本模糊匹配有边界漏洞~~ → 2026-09-20：废除文本匹配——open 前子会话日志里的 next-turn 队列项只可能是继承来的（用户还碰不到子会话），按 `/edit-resend-inbox` 回报 id 精确移除；纯附件消息空文本被跳过、相近前缀误删两种情况同愈。
- ~~`purgeInheritedQueue` 全量清队列，存在误删窗口~~ → 2026-09-20：只删继承项 id；`state.clean` 确认后不再 cancel running（用户自己跑的回合不动）。inbox 读取失败（404 重试耗尽=宿主/日志故障）时 `purgeIds=null` 退化为全量清理兜底——宁可误清不可让重放复活。
- ~~`locateNode` 的索引对齐回退不可靠~~ → 2026-09-20：弃用索引回退；探测文本加附件名（纯附件消息也能匹配）；匹配不上则不挂按钮且不设 PROCESSED，下轮 DOM 变化自动重试——挂错按钮比不挂更糟。
- ~~`README.md` 内容过时~~ → 2026-09-20 随改名 `dsh-client-ui-tweaks` 重写，与现实现一致。
- ~~依赖构建期哈希类名 `.YDXeBa_sessionRow`/`.YDXeBa_title`~~ → 侧栏行改走 `role="treeitem"` + 本地名后缀 + (标题,时间)映射；`parentTitle` 改从宿主读会话日志的 `session/title` 真值（GET `/edit-resend-branches` 返回 `titles`）。
- ~~分支标题带 ` (n)` 编号导致顶部标题与侧栏不一致~~ → 分支创建即改名与父会话同名（rename 会写 `session/title` 并钉住标题，顶部与侧栏同源于 sessions 快照）；旧记录由 `migrateBranchTitles` 启动时自愈。
- ~~切走再切回默认落在 1/N 原版~~ → 订阅 `uiSession.adapter.current` 变化，打开家族会话时重定向到 updatedAt 最新的成员（箭头切换走旁路）；侧栏每个家族只留一行可见（当前成员 > 运行中 > 刚完成 > 最近更新），点击进入的即为最近工作分支。
- ~~分支工作时侧栏无转圈~~ → 家族可见行就是正在工作的会话自己的行，dsh 原生 StateDot（ongoing/done）自然出现，零自研。
- ~~窗口隐藏时 rAF 停摆导致注入失效~~ → `scheduleInject` 增加 setTimeout 兜底（验证时发现：页面 hidden 状态下 rAF 不触发，编辑键/箭头不再注入）。
- 数据修复：本轮把 `branches.json` 里被早期错误迁移写成 "工作区目录名" 的记录恢复为 "真实标题"；分支会话 `session-eadca8b6` 标题已钉为与父同名。
