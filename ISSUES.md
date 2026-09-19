# 已知问题记录

体检与 UX 优化中发现的隐患。**未标记的均为待修复**，等功能稳定后统一处理。

## 待修复

### 1. `sendEdited` 早退不释放全局锁（高优先级）

- 位置：`lib/client.js` `sendEdited` 里 `if (typeof seq !== "number") return;`
- 症状：该 return 发生在 `sendInFlight = true` 且已乐观渲染之后，既没有 `clearOptimistic(row)` 也没有 `sendInFlight = false`。
- 后果：一旦命中（节点没有数字 seq），该行卡在乐观泡泡状态，且全局发送锁永久占用——之后所有编辑发送都被静默忽略，只能刷新页面。
- 修复方向：与其余失败分支一致，走 `clearOptimistic(row)` + 释放锁。

### 2. `findSessionLog` 只认 `session.v3.jsonl.zstd`

- 位置：`index.js` `findSessionLog`。
- 症状：当前 dsh 会话均为 v3，但家目录还有旧格式 `session.jsonl.zstd`（v0，子代理/旧会话）不匹配。
- 后果：若未来日志格式改名，`/edit-resend-inbox` 与标题读取静默失效 → 旧 bug（重答原问题）无声复活。
- 修复方向：候选文件名列全（v3 + 旧名），或按目录内最新 `.zstd` 选取；找不到时返回明确状态而非空数组。

### 3. 继承队列清除的文本模糊匹配有边界漏洞

- 位置：`lib/client.js` `sendEdited` 里 `originalText` 计算与 `item.text.includes(originalText.slice(0, 30))`。
- 症状 a：`originalText` 为空（纯附件消息）时整个清除步骤被跳过，继承的空文本队列项会留下来被重放。
- 症状 b：前 30 字前缀匹配，遇到队列里有多条相近前缀的消息（如用户排队了相似 steering 消息）可能误删。
- 修复方向：优先按事件来源/消息 id 精确判定（继承项在日志中有 splice 事件可对照），文本匹配只作兜底。

### 4. `purgeInheritedQueue` 全量清队列，存在误删窗口

- 位置：`lib/client.js` `purgeInheritedQueue`。
- 症状：不区分来源，`queueMirror.snapshot()` 里的项一律 remove。open 之后的轮询循环里反复调用。
- 后果：若用户在新分支打开后、该函数仍在轮询的窗口内自己排了消息，会被误清。窗口小但存在。
- 修复方向：只删 `/edit-resend-inbox` 回报过的继承项 id，不碰其余。

### 5. `README.md` 内容过时

- 位置：`README.md` 全文。
- 症状：仍描述初版（"纯浏览器端插件，无宿主侧逻辑"、回填输入框交互）。
- 后果：与当前实现（宿主端路由 + 内联编辑 + fork 分支 + `‹ n/N ›` 箭头 + 侧栏家族归并 + 标题统一）完全脱节，误导后续维护。
- 修复方向：功能稳定后重写。

### 6. `locateNode` 的索引对齐回退不可靠（低优先级）

- 位置：`lib/client.js` `locateNode`。
- 症状：文本匹配失败时按 `rows.indexOf(row)` 对齐 `nodes`；注释已自述"索引映射在 context 消息穿插时不可靠"。
- 后果：失配时编辑按钮可能定位到错误消息节点（拿错 seq/内容）。
- 修复方向：提高文本匹配覆盖率（附件消息用附件名/占位文本），或放弃索引回退改为不挂按钮。

### 7. 侧栏行映射的残余碰撞面（低优先级）

- 位置：`lib/client.js` `syncBranchRows` / `sessionRowsByKey`。
- 现状（2026-09-19 优化后）：侧栏行通过 (displayTitle, timeLabel(updatedAt)) 对精确映射到家族成员，冷启动标题退化为 cwd 名时也可分。
- 残余风险：同工作区、同 cwd 退化名、且 updatedAt 落在同一时间桶（如都是"2天"）的无标题会话可能撞 key，导致非家族行被误归并。概率低，自愈于下一次同步。
- 另：选择器 `[class*="_title"]/[_time]` 依赖 CSS-module 的本地名后缀（比完整哈希类名稳定，但非零风险）；`role="treeitem"` 是结构性锚点，较稳。

## 已修复（2026-09-19 UX 优化轮）

- ~~依赖构建期哈希类名 `.YDXeBa_sessionRow`/`.YDXeBa_title`~~ → 侧栏行改走 `role="treeitem"` + 本地名后缀 + (标题,时间)映射；`parentTitle` 改从宿主读会话日志的 `session/title` 真值（GET `/edit-resend-branches` 返回 `titles`）。
- ~~分支标题带 ` (n)` 编号导致顶部标题与侧栏不一致~~ → 分支创建即改名与父会话同名（rename 会写 `session/title` 并钉住标题，顶部与侧栏同源于 sessions 快照）；旧记录由 `migrateBranchTitles` 启动时自愈。
- ~~切走再切回默认落在 1/N 原版~~ → 订阅 `uiSession.adapter.current` 变化，打开家族会话时重定向到 updatedAt 最新的成员（箭头切换走旁路）；侧栏每个家族只留一行可见（当前成员 > 运行中 > 刚完成 > 最近更新），点击进入的即为最近工作分支。
- ~~分支工作时侧栏无转圈~~ → 家族可见行就是正在工作的会话自己的行，dsh 原生 StateDot（ongoing/done）自然出现，零自研。
- ~~窗口隐藏时 rAF 停摆导致注入失效~~ → `scheduleInject` 增加 setTimeout 兜底（验证时发现：页面 hidden 状态下 rAF 不触发，编辑键/箭头不再注入）。
- 数据修复：本轮把 `branches.json` 里被早期错误迁移写成 "工作区目录名" 的记录恢复为 "真实标题"；分支会话 `session-eadca8b6` 标题已钉为与父同名。
