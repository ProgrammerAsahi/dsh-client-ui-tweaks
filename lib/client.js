window.__ModuleLoader__.load({
  id: "dsh-client-ui-tweaks",
  factory: () => {
    const NS = "edit-resend";
    const BTN_ATTR = "data-edit-resend-btn";
    const NAV_ATTR = "data-edit-resend-nav";
    const EDITOR_ATTR = "data-edit-resend-editor";
    const PROCESSED_ATTR = "data-edit-resend-processed";
    const HIDDEN_ATTR = "data-er-swap-hidden";
    const COPY_LABELS = new Set(["复制", "已复制", "Copy", "Copied", "copy", "copied"]);
    const zh = typeof navigator !== "undefined" && (navigator.language || "en").toLowerCase().startsWith("zh");
    const t = (key) => ({
      edit: zh ? "编辑" : "Edit",
      editTitle: zh ? "编辑并重新发送（回填到输入框）" : "Edit and resend (back to composer)",
      prevBranch: zh ? "上一个分支" : "Previous branch",
      nextBranch: zh ? "下一个分支" : "Next branch",
      send: zh ? "发送" : "Send",
      cancel: zh ? "取消" : "Cancel",
    })[key] ?? key;

    const STYLE = `
      [${BTN_ATTR}] {
        display: inline-flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; padding: 0; border: none; border-radius: 6px;
        background: transparent; color: inherit; opacity: 0.55; cursor: pointer;
        flex: none;
      }
      [${BTN_ATTR}]:hover { opacity: 1; background: rgba(127, 127, 127, 0.18); }
      [${BTN_ATTR}]:focus-visible { opacity: 1; outline: 2px solid currentColor; outline-offset: 1px; }
      [${BTN_ATTR}] svg { width: 15px; height: 15px; display: block; }
      [${NAV_ATTR}] {
        display: inline-flex; align-items: center; gap: 2px; flex: none;
        opacity: 0.75; font-size: 11px; line-height: 1;
        font-variant-numeric: tabular-nums; color: inherit;
      }
      [${NAV_ATTR}] button {
        display: inline-flex; align-items: center; justify-content: center;
        width: 18px; height: 18px; padding: 0; border: none; border-radius: 5px;
        background: transparent; color: inherit; cursor: pointer; font-size: 13px;
        line-height: 1; opacity: 0.8;
      }
      [${NAV_ATTR}] button:hover:not(:disabled) { opacity: 1; background: rgba(127, 127, 127, 0.18); }
      [${NAV_ATTR}] button:disabled { opacity: 0.25; cursor: default; }
      [${NAV_ATTR}] [data-er-nav-label] { min-width: 30px; text-align: center; user-select: none; }

      [${EDITOR_ATTR}] {
        display: flex; flex-direction: column; gap: 8px;
        width: 100%; margin: 4px 0;
        padding: 10px 12px 8px;
        border: 1px solid rgba(127, 127, 127, 0.35);
        border-radius: 14px;
        background: rgba(127, 127, 127, 0.06);
      }
      [${EDITOR_ATTR}] textarea {
        width: 100%; border: none; outline: none; resize: none;
        background: transparent; color: inherit;
        font: inherit; line-height: 1.5;
        min-height: 22px; max-height: 40vh; overflow-y: auto;
        padding: 2px 0; margin: 0;
      }
      [${EDITOR_ATTR}] [data-er-toolbar] {
        display: flex; justify-content: flex-end; align-items: center; gap: 8px;
      }
      [${EDITOR_ATTR}] [data-er-round] {
        display: inline-flex; align-items: center; justify-content: center;
        width: 28px; height: 28px; border: none; border-radius: 50%;
        cursor: pointer; flex: none; color: #fff;
      }
      [${EDITOR_ATTR}] [data-er-round="send"] { background: #2f6fdf; }
      [${EDITOR_ATTR}] [data-er-round="send"]:hover { background: #2a63c4; }
      [${EDITOR_ATTR}] [data-er-round="cancel"] { background: #d43a3a; }
      [${EDITOR_ATTR}] [data-er-round="cancel"]:hover { background: #bd3030; }
      [${EDITOR_ATTR}] [data-er-round] svg { width: 14px; height: 14px; display: block; }

      [data-er-hidden] { display: none !important; }

      [data-er-optimistic] {
        align-self: flex-end; max-width: 85%;
        padding: 8px 12px; margin: 4px 0;
        border-radius: 14px;
        background: rgba(47, 111, 223, 0.14);
        line-height: 1.5; white-space: pre-wrap; word-break: break-word;
      }
      [data-er-processing] {
        align-self: flex-end; font-size: 12px; opacity: 0.7;
        padding: 2px 4px; user-select: none;
        animation: er-shimmer 1.2s ease-in-out infinite;
      }
      @keyframes er-shimmer {
        0%, 100% { opacity: 0.35; }
        50% { opacity: 0.85; }
      }
      [${EDITOR_ATTR}] [data-er-round]:disabled { opacity: 0.45; cursor: default; }
    `;

    function splitContent(content) {
      const texts = [];
      const attachments = [];
      if (Array.isArray(content)) {
        for (const block of content) {
          if (!block || typeof block !== "object") continue;
          if (block.type === "text" && typeof block.text === "string") texts.push(block.text);
          else if (block.type === "image" && block.attachment !== undefined) attachments.push({ kind: "image", desc: block.attachment });
          else if (block.type === "file" && block.attachment !== undefined) attachments.push({ kind: "file", desc: block.attachment });
        }
      }
      return { text: texts.join(""), attachments };
    }

    function pencilSvg() {
      return '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11.3 2.3a1.7 1.7 0 0 1 2.4 2.4l-7.9 7.9-3.1.7.7-3.1 7.9-7.9Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M9.8 3.8l2.4 2.4" stroke="currentColor" stroke-width="1.3"/></svg>';
    }

    function arrowUpSvg() {
      return '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 12V3M4 7l4-4 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

    function crossSvg() {
      return '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    }

    return {
      inject: ["uiSession", "sessions", "conversation", "locale", "workspaces"],
      apply(ctx) {
        try {
          const locale = ctx.get ? ctx.get("locale") : undefined;
          if (locale?.register) {
            ctx.effect(() => locale.register(NS, {
              zh: { edit: "编辑", editTitle: "编辑并重新发送（回填到输入框）" },
              en: { edit: "Edit", editTitle: "Edit and resend (back to composer)" },
            }), "edit-resend: dictionaries");
          }
        } catch {}

        const styleEl = document.createElement("style");
        styleEl.textContent = STYLE;
        document.head.appendChild(styleEl);
        ctx.effect(() => () => styleEl.remove(), "edit-resend: styles");

        function currentBinding() {
          try {
            const binding = ctx.uiSession.adapter.current.getSnapshot();
            return binding && binding.key ? binding : null;
          } catch {
            return null;
          }
        }

        function chatSnapshot(binding) {
          try { return binding.hooks?.chat?.getSnapshot?.(); } catch { return undefined; }
        }

        function resolveNodeByKey(byKey, key) {
          if (!byKey) return undefined;
          if (typeof byKey.get === "function") {
            const fromMap = byKey.get(key);
            if (fromMap !== undefined) return fromMap;
          }
          return byKey[key];
        }

        function userMessageNodes(binding) {
          const snapshot = chatSnapshot(binding);
          if (!snapshot || !Array.isArray(snapshot.order) || !snapshot.nodes?.byKey) return [];
          return snapshot.order
            .filter((key) => typeof key === "string" && key.includes("input-message"))
            .map((key) => resolveNodeByKey(snapshot.nodes.byKey, key))
            .filter(Boolean)
            .filter((node) => {
              const kind = node?.kind ?? node?.data?.kind;
              return kind === "user" || kind === "steering";
            });
        }

        /** 节点探测文本：正文 + 附件名（纯附件消息才匹配得上）。 */
        function nodeProbeText(candidate) {
          const { text, attachments } = splitContent(candidate?.data?.content);
          const names = attachments.map((a) => a?.desc?.name).filter((n) => typeof n === "string");
          return `${text} ${names.join(" ")}`.replace(/\s+/g, " ").trim();
        }

        // 只信文本匹配：索引对齐在 context 消息穿插时不可靠，挂错按钮比不挂更糟
        function locateNode(row, nodes) {
          const rowText = (row.textContent ?? "").replace(/\s+/g, " ").trim();
          if (rowText.length < 12) return undefined;
          return nodes.find((candidate) => {
            const probe = nodeProbeText(candidate);
            return probe !== "" && (rowText.includes(probe.slice(0, Math.min(60, probe.length))) || probe.includes(rowText.slice(0, Math.min(60, rowText.length))));
          });
        }

        let branchCache = { at: 0, records: [], titles: {} };
        async function loadBranches(force = false) {
          if (!force && branchCache.at > 0 && Date.now() - branchCache.at < 4000) {
            return branchCache.records;
          }
          try {
            const response = await fetch("/edit-resend-branches");
            const body = await response.json();
            branchCache = {
              at: Date.now(),
              records: Array.isArray(body?.branches) ? body.branches : [],
              titles: body?.titles && typeof body.titles === "object" ? body.titles : {},
            };
          } catch {}
          return branchCache.records;
        }

        async function postBranch(record) {
          try {
            await fetch("/edit-resend-branches", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ record }),
            });
            branchCache.at = 0;
          } catch {}
        }

        function liveChildIds() {
          try {
            const snapshot = ctx.sessions.list.getSnapshot();
            const ids = new Set();
            const collect = (value) => {
              if (!value) return;
              if (Array.isArray(value)) {
                for (const v of value) {
                  const id = v?.sessionId ?? v?.id ?? v;
                  if (typeof id === "string") ids.add(id);
                }
              } else if (typeof value === "object") {
                for (const v of Object.values(value)) {
                  const id = v?.sessionId ?? v?.id;
                  if (typeof id === "string") ids.add(id);
                }
              }
            };
            collect(snapshot?.byId);
            collect(snapshot?.items);
            collect(snapshot?.summaries);
            collect(snapshot);
            return ids.size > 0 ? ids : null;
          } catch {
            return null;
          }
        }

        function computeGroups(binding, records) {
          const sessionId = binding.key;
          const groups = [];
          const byAnchor = new Map();
          for (const record of records) {
            if (typeof record?.parentMsgSeq !== "number") continue;
            const key = `${record.parentId}:${record.parentMsgSeq}`;
            if (!byAnchor.has(key)) byAnchor.set(key, []);
            byAnchor.get(key).push(record);
          }
          const live = liveChildIds();
          for (const siblings of byAnchor.values()) {
            siblings.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
            const filtered = live ? siblings.filter((record) => live.has(record.childId)) : siblings;
            if (filtered.length === 0) continue;
            const parentId = filtered[0].parentId;
            const parentMsgSeq = filtered[0].parentMsgSeq;
            const anchorSeq = filtered[0].anchorSeq;
            const versions = [parentId, ...filtered.map((record) => record.childId)];
            let currentIndex = -1;
            if (sessionId === parentId) currentIndex = 0;
            else {
              const rank = filtered.findIndex((record) => record.childId === sessionId);
              if (rank >= 0) currentIndex = rank + 1;
            }
            if (currentIndex >= 0) {
              groups.push({ parentId, parentMsgSeq, anchorSeq, versions, currentIndex });
            }
          }
          return groups;
        }

        /** 沿分支记录向上解析根会话 id 与当前会话的分支记录。 */
        function rootOf(id, records) {
          let cur = id;
          let rec = null;
          for (let g = 0; g < 12; g++) {
            const r = records.find((x) => x.childId === cur);
            if (!r) break;
            rec = r;
            cur = r.parentId;
          }
          return { rootId: cur, record: rec };
        }

        /** 当前会话里"分支版消息"的 seq：fork 分支为锚点之后的第一条新用户消息；create 分支为第一条用户消息。 */
        function branchVersionSeq(binding, branchRec) {
          if (!branchRec) return null;
          const nodes = userMessageNodes(binding);
          if (branchRec.anchorSeq == null) {
            return nodes[0]?.data?.seq ?? nodes[0]?.anchorSeq ?? null;
          }
          const firstNew = nodes.find((n) => {
            const s = n?.data?.seq ?? n?.anchorSeq;
            return typeof s === "number" && s > branchRec.anchorSeq;
          });
          return firstNew?.data?.seq ?? firstNew?.anchorSeq ?? null;
        }

        function navElement(group, onSwitch) {
          const wrap = document.createElement("span");
          wrap.setAttribute(NAV_ATTR, "1");
          const makeBtn = (label, title, delta) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = label;
            btn.title = title;
            btn.setAttribute("aria-label", title);
            const target = group.currentIndex + delta;
            btn.disabled = target < 0 || target >= group.versions.length;
            btn.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              onSwitch(target);
            });
            return btn;
          };
          const label = document.createElement("span");
          label.setAttribute("data-er-nav-label", "1");
          label.textContent = `${group.currentIndex + 1}/${group.versions.length}`;
          wrap.append(
            makeBtn("‹", t("prevBranch"), -1),
            label,
            makeBtn("›", t("nextBranch"), +1),
          );
          return wrap;
        }

        // 箭头切换/内部 open 的旁路窗口：窗口内不做"最近成员"重定向
        let navBypassUntil = 0;

        async function switchTo(sessionId) {
          navBypassUntil = Date.now() + 3000;
          try { await ctx.sessions.open(sessionId); } catch {}
        }

        /** id 所属的家族成员列表（根 + 全部分支）；不属于任何家族返回 null。 */
        function familyMembersOf(id, records) {
          const { rootId } = rootOf(id, records);
          const children = records.filter((r) => r.parentId === rootId).map((r) => r.childId);
          if (children.length === 0) return null;
          return [rootId, ...children];
        }

        /** 家族里 updatedAt 最新的在列成员（"上次工作过的分支"）。 */
        function mostRecentMemberId(members) {
          let byId = {};
          try { byId = ctx.sessions.list.getSnapshot()?.byId ?? {}; } catch {}
          let best = null;
          let bestAt = -1;
          for (const id of members) {
            const summary = byId?.[id];
            if (!summary) continue;
            const at = typeof summary.updatedAt === "number" ? summary.updatedAt : 0;
            if (at >= bestAt) { bestAt = at; best = id; }
          }
          return best;
        }

        // ---------------- 侧栏家族行归并 ----------------
        // dsh 侧栏行不带 session id（只有 role="treeitem" + 标题 + 相对时间），
        // 但行的标题与时间都精确来自 sessions 快照：displayTitle + timeLabel(updatedAt)。
        // 复刻 dsh 的 timeLabel（dsh-client-ui-primitives relativeTime 的分桶与语言模板），
        // 用 (标题, 时间标签) 对把 DOM 行精确映射回会话——冷启动标题退化为 cwd 名时依然可分。
        const TIME_UNITS = zh
          ? { now: () => "刚刚", minutes: (n) => `${n}分钟`, hours: (n) => `${n}小时`, days: (n) => `${n}天`, months: (n) => `${n}个月`, years: (n) => `${n}年` }
          : { now: () => "now", minutes: (n) => `${n}min`, hours: (n) => `${n}h`, days: (n) => `${n}d`, months: (n) => `${n}mo`, years: (n) => `${n}y` };

        function timeLabelOf(updatedAt, now) {
          const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
          const diff = Math.max(0, now - updatedAt);
          if (diff < MIN) return TIME_UNITS.now();
          if (diff < HOUR) return TIME_UNITS.minutes(Math.floor(diff / MIN));
          if (diff < DAY) return TIME_UNITS.hours(Math.floor(diff / HOUR));
          if (diff < 30 * DAY) return TIME_UNITS.days(Math.floor(diff / DAY));
          if (diff < 365 * DAY) return TIME_UNITS.months(Math.floor(diff / (30 * DAY)));
          return TIME_UNITS.years(Math.floor(diff / (365 * DAY)));
        }

        function sessionRowsByKey() {
          const map = new Map();
          for (const row of document.querySelectorAll('[role="treeitem"][aria-selected]')) {
            if (row.querySelector('[class*="_projectText"]')) continue;
            const title = row.querySelector('[class*="_title"], [class*="_unreadTitle"]')?.textContent ?? "";
            const time = row.querySelector('[class*="_time"]')?.textContent ?? "";
            if (!title) continue;
            const key = `${title}${time}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(row);
          }
          return map;
        }

        /** 每个分支家族在侧栏只留一行可见：当前打开的成员 > 运行中 > 刚完成 > 最近更新。 */
        function syncBranchRows(records) {
          if (!records.length) return;
          let snap;
          try { snap = ctx.sessions.list.getSnapshot(); } catch { return; }
          const byId = snap?.byId ?? {};
          const current = snap?.current;
          const families = new Map();
          for (const record of records) {
            if (typeof record?.parentId !== "string" || typeof record?.childId !== "string") continue;
            if (!families.has(record.parentId)) families.set(record.parentId, []);
            families.get(record.parentId).push(record.childId);
          }
          if (families.size === 0) return;
          const rowsByKey = sessionRowsByKey();
          const now = Date.now();
          const claimed = new Set();
          for (const [rootId, childIds] of families) {
            const found = [];
            for (const id of [rootId, ...childIds]) {
              const summary = byId[id];
              if (!summary || typeof summary.displayTitle !== "string") continue;
              const updatedAt = typeof summary.updatedAt === "number" ? summary.updatedAt : 0;
              const key = `${summary.displayTitle}${timeLabelOf(updatedAt, now)}`;
              const bucket = (rowsByKey.get(key) ?? []).filter((candidate) => !claimed.has(candidate));
              // 撞 key 时优先认领"选中态 == 是否当前会话"的行，降低误并非家族行的概率
              const row = bucket.find((candidate) => (candidate.getAttribute("aria-selected") === "true") === (id === current)) ?? bucket[0];
              if (!row) continue;
              claimed.add(row);
              found.push({ id, row, summary });
            }
            if (found.length === 0) continue;
            const chosen = found.find((f) => f.id === current)
              ?? found.find((f) => f.summary.running === true)
              ?? found.find((f) => f.summary.completed === true)
              ?? found.reduce((a, b) => ((b.summary.updatedAt ?? 0) > (a.summary.updatedAt ?? 0) ? b : a));
            for (const f of found) {
              if (f === chosen) {
                if (f.row.hasAttribute("data-er-hidden")) {
                  f.row.style.display = "";
                  f.row.removeAttribute("data-er-hidden");
                }
              } else if (!f.row.hasAttribute("data-er-hidden")) {
                f.row.setAttribute("data-er-hidden", "1");
                f.row.style.display = "none";
              }
            }
          }
        }

        /** 一次性迁移：把分支会话改名成根会话标题（去掉旧的 (n) 编号），并同步记录。
         *  标题一律以宿主从会话日志读出的真值为准——快照 displayTitle 可能退化成 cwd 名。 */
        let migrated = false;
        async function migrateBranchTitles() {
          if (migrated) return;
          const records = await loadBranches(true);
          migrated = true;
          for (const record of records) {
            try {
              const rootTitle = branchCache.titles?.[record.parentId] ?? record.parentTitle;
              if (typeof rootTitle !== "string" || rootTitle.length === 0) continue;
              const childLogTitle = branchCache.titles?.[record.childId];
              if (typeof childLogTitle === "string" && childLogTitle !== rootTitle) {
                let listed = false;
                try { listed = Boolean(ctx.sessions.list.getSnapshot()?.byId?.[record.childId]); } catch {}
                if (listed) {
                  const session = ctx.sessions.binding(record.childId)?.session;
                  if (typeof session?.rename === "function") await session.rename(rootTitle);
                }
              }
              if (record.childTitle !== rootTitle || record.parentTitle !== rootTitle) {
                await postBranch({ ...record, parentTitle: rootTitle, childTitle: rootTitle });
              }
            } catch {}
          }
        }

        // ---------------- 内联编辑器 ----------------
        let activeEditor = null;

        function closeActiveEditor(restore = true) {
          if (!activeEditor) return;
          const { row } = activeEditor;
          activeEditor = null;
          const editor = row.querySelector(`[${EDITOR_ATTR}]`);
          if (editor) editor.remove();
          if (restore) {
            for (const el of row.querySelectorAll(`[${HIDDEN_ATTR}]`)) {
              el.style.display = '';
              el.removeAttribute(HIDDEN_ATTR);
            }
          }
        }

        function buildInlineEditor(initialText, { onSend, onCancel }) {
          const wrap = document.createElement("div");
          wrap.setAttribute(EDITOR_ATTR, "1");

          const textarea = document.createElement("textarea");
          textarea.value = initialText;
          textarea.rows = 1;
          const autosize = () => {
            textarea.style.height = "auto";
            textarea.style.height = Math.min(textarea.scrollHeight, window.innerHeight * 0.4) + "px";
          };
          textarea.addEventListener("input", autosize);

          const toolbar = document.createElement("div");
          toolbar.setAttribute("data-er-toolbar", "1");

          const cancelBtn = document.createElement("button");
          cancelBtn.type = "button";
          cancelBtn.setAttribute("data-er-round", "cancel");
          cancelBtn.title = t("cancel");
          cancelBtn.setAttribute("aria-label", t("cancel"));
          cancelBtn.innerHTML = crossSvg();
          cancelBtn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          });

          const sendBtn = document.createElement("button");
          sendBtn.type = "button";
          sendBtn.setAttribute("data-er-round", "send");
          sendBtn.title = t("send");
          sendBtn.setAttribute("aria-label", t("send"));
          sendBtn.innerHTML = arrowUpSvg();
          sendBtn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            onSend(textarea.value);
          });

          toolbar.append(cancelBtn, sendBtn);
          wrap.append(textarea, toolbar);

          textarea.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            } else if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.stopPropagation();
              onSend(textarea.value);
            }
          });

          requestAnimationFrame(() => {
            autosize();
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
          });
          return wrap;
        }

        function beginInlineEdit(row, node) {
          closeActiveEditor(true);
          const { text, attachments } = splitContent(node?.data?.content);
          for (const part of [...row.children]) {
            part.style.display = "none";
            part.setAttribute(HIDDEN_ATTR, "1");
          }
          const editor = buildInlineEditor(text, {
            onSend: (editedText) => {
              void sendEdited(row, node, editedText, attachments);
            },
            onCancel: () => closeActiveEditor(true),
          });
          row.appendChild(editor);
          activeEditor = { row };
        }

        /** 清除子会话里继承来的"待处理队列消息"（防止重放原问题导致重答）。
         *  inheritedIds：id 集合 = 精准移除这些继承项，不碰用户新排的消息；
         *               null = inbox 读取失败（宿主故障），退化为全量清理保安全（宁可误清不可重放）；
         *               空集合 = 确认无继承，直接不碰。
         *  state.clean 确认后（队列无继承项且未在跑）不再打断 running；null 模式下永不标记干净。 */
        async function purgeInheritedQueue(childId, inheritedIds, state) {
          if (state?.clean) return;
          if (inheritedIds && inheritedIds.size === 0) {
            if (state) state.clean = true;
            return;
          }
          try {
            const session = ctx.sessions.binding(childId)?.session;
            if (!session) return;
            // 队列帧到达后（open 流式下发），移除其中的继承项
            const items = typeof session.queueMirror?.snapshot === "function" ? session.queueMirror.snapshot() : [];
            let remaining = 0;
            for (const item of items) {
              const id = item?.id ?? item?.itemId;
              if (!id) continue;
              if (inheritedIds && !inheritedIds.has(id)) continue;
              remaining++;
              if (typeof session.updateQueue === "function") {
                try { await session.updateQueue(id, { kind: "remove" }); } catch {}
              }
            }
            // 继承项可能已开跑成回合：趁未确认干净前打断；确认干净后用户自己跑的不动
            if (session.running === true && typeof session.cancel === "function") {
              try { await session.cancel(); } catch {}
            } else if (inheritedIds && remaining === 0 && session.running !== true) {
              if (state) state.clean = true;
            }
          } catch {}
        }

        // ---------------- 发送：此时才 fork ----------------
        let sendInFlight = false;

        function showOptimistic(row, editedText) {
          // 编辑器关闭 -> 原地渲染新文本泡泡 + 深度求索中动画
          const editor = row.querySelector(`[${EDITOR_ATTR}]`);
          if (editor) editor.remove();
          const bubble = document.createElement("div");
          bubble.setAttribute("data-er-optimistic", "1");
          bubble.textContent = editedText;
          const processing = document.createElement("div");
          processing.setAttribute("data-er-processing", "1");
          processing.textContent = zh ? "深度求索中…" : "Thinking…";
          row.append(bubble, processing);
        }

        function clearOptimistic(row) {
          for (const el of row.querySelectorAll("[data-er-optimistic],[data-er-processing]")) el.remove();
          // 恢复原始内容可见（fork 视图切换走以后此函数基本无感，但保持兜底）
          for (const el of row.querySelectorAll(`[${HIDDEN_ATTR}]`)) {
            el.style.display = '';
            el.removeAttribute(HIDDEN_ATTR);
          }
          activeEditor = null;
        }

        async function sendEdited(row, node, editedText, attachments) {
          if (sendInFlight) return;
          sendInFlight = true;
          // 立即生效：编辑器消失，新泡泡 + 处理中动画出现
          const sendBtn = row.querySelector('[data-er-round="send"]');
          if (sendBtn) sendBtn.disabled = true;
          showOptimistic(row, editedText);
          const binding = currentBinding();
          if (!binding) {
            clearOptimistic(row);
            sendInFlight = false;
            return;
          }
          const sourceId = binding.key;
          const seq = node?.data?.seq ?? node?.anchorSeq;
          if (typeof seq !== "number") {
            clearOptimistic(row);
            sendInFlight = false;
            return;
          }

          const files = [];
          const sourceSession = (() => {
            try { return ctx.sessions.binding(sourceId)?.session; } catch { return undefined; }
          })();
          for (const attachment of attachments) {
            try {
              const desc = attachment.desc ?? {};
              const attachmentId = desc.attachmentId ?? desc.id ?? desc.key;
              if (!attachmentId || typeof sourceSession?.readAttachment !== "function") continue;
              const result = await sourceSession.readAttachment(attachmentId);
              if (!result?.ok || !result.value) continue;
              const mediaType = result.value.attachment?.mediaType || desc.mediaType || "application/octet-stream";
              const name = desc.name || (attachment.kind === "image" ? "image.png" : "attachment");
              const bytes = Uint8Array.from(result.value.data ?? []);
              if (bytes.length === 0) continue;
              files.push(new File([bytes], name, { type: mediaType }));
            } catch {}
          }

          const msgTurn = node?.location?.turn?.turn;
          const turnStartSeq = node?.location?.turn?.start?.seq;
          // 锚点：被编辑消息所在回合的「上一回合 turn/end」。
          // 找不到上一回合（首条消息）→ 不重fork，而是 create 全新会话从零重开分支。
          let prevTailSeq;
          try {
            if (typeof msgTurn === "number") {
              const snap = chatSnapshot(binding);
              const byKey = snap?.nodes?.byKey;
              const tails = (snap?.order ?? [])
                .filter((k) => typeof k === "string" && k.includes("turn-tail"))
                .map((k) => {
                  const tailNode = resolveNodeByKey(byKey, k);
                  return {
                    turn: tailNode?.location?.turn?.turn ?? tailNode?.data?.turn,
                    seq: tailNode?.data?.seq ?? tailNode?.anchorSeq,
                  };
                })
                .filter((tail) => typeof tail.turn === "number" && typeof tail.seq === "number")
                .sort((a, b) => a.turn - b.turn);
              const prevTail = [...tails].reverse().find((tail) => tail.turn < msgTurn && tail.seq < seq);
              if (prevTail) prevTailSeq = prevTail.seq;
            }
          } catch {}

          const isFirstMessageBranch = prevTailSeq === undefined;
          let childId = null;
          let atSeqUsed = null;
          if (isFirstMessageBranch) {
            // 首条消息：没有可继承的历史，create 空白会话，编辑稿成为其第一条消息
            try {
              childId = await ctx.sessions.create({});
            } catch (e) {
              childId = null;
            }
          } else {
            const anchors = [prevTailSeq, typeof turnStartSeq === "number" ? turnStartSeq - 2 : undefined, typeof turnStartSeq === "number" ? turnStartSeq - 3 : undefined]
              .filter((atSeq) => typeof atSeq === "number" && atSeq >= 0);
            for (const atSeq of anchors) {
              try {
                childId = await ctx.sessions.fork({ sessionId: sourceId, atSeq, increaseTitle: false });
                atSeqUsed = atSeq;
                break;
              } catch {
                childId = null;
              }
            }
          }
          if (childId === null) {
            clearOptimistic(row);
            sendInFlight = false;
            return;
          }

          // 记录分支 + 自有编号改名（确定性标题，供侧栏隐藏匹配）
          // 归属到根家族：parentId = 根会话，parentMsgSeq = 根消息 seq
          const recordsNow = await loadBranches(true);
          const { rootId, record: branchRec } = rootOf(sourceId, recordsNow);
          let groupParentMsgSeq = seq;
          if (branchRec) {
            const versionSeq = branchVersionSeq(binding, branchRec);
            if (versionSeq === seq) groupParentMsgSeq = branchRec.parentMsgSeq ?? seq;
          }
          // 家族标题统一用根会话标题：分支与父会话同名，顶部标题与侧栏保持一致。
          // 优先日志真值；displayTitle 可能退化成 cwd 名，只作最后手段。
          const parentTitle = (() => {
            const fromLog = branchCache.titles?.[rootId];
            if (typeof fromLog === "string" && fromLog) return fromLog;
            try {
              const live = ctx.sessions.list.getSnapshot()?.byId?.[rootId];
              if (typeof live?.title === "string" && live.title) return live.title;
              if (typeof live?.displayTitle === "string" && live.displayTitle) return live.displayTitle;
            } catch {}
            return branchRec?.parentTitle ?? null;
          })();
          const childTitle = parentTitle;

          await postBranch({
            childId,
            parentId: rootId,
            parentTitle,
            childTitle,
            parentMsgSeq: groupParentMsgSeq,
            anchorSeq: atSeqUsed,
            createdAt: Date.now(),
          });

          // 先清后开：open 前子会话日志里的 next-turn 队列项只可能是继承来的（用户还碰不到子会话），
          // 按宿主回报的 id 精确移除——不做文本匹配（纯附件消息原文为空、相近前缀会误删）。
          // 404 = 日志尚未就绪，重试；200 空数组 = 真没有继承项，直接结束轮询。
          const inheritedIds = new Set();
          let inboxKnown = false;
          try {
            let items = null;
            for (let attempt = 0; attempt < 10 && items === null; attempt++) {
              const res = await fetch("/edit-resend-inbox", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ sessionId: childId }),
              });
              if (res.ok) {
                inboxKnown = true;
                const payload = await res.json();
                items = Array.isArray(payload?.items) ? payload.items : [];
              } else {
                await new Promise((resolve) => setTimeout(resolve, 200));
              }
            }
            for (const item of items ?? []) {
              if (item?.id) inheritedIds.add(item.id);
            }
            const session = ctx.sessions.binding(childId)?.session;
            for (const id of inheritedIds) {
              try { await session?.updateQueue?.(id, { kind: "remove" }); } catch {}
            }
          } catch {}

          navBypassUntil = Date.now() + 15000;
          try { await ctx.sessions.open(childId); } catch {}

          const deadline = Date.now() + 8000;
          let childBinding = null;
          // inbox 没读出来（宿主/日志故障）→ purgeIds = null，purge 退化为全量清理兜底，防重放复活
          const purgeIds = inboxKnown ? inheritedIds : null;
          const purgeState = { clean: inboxKnown && inheritedIds.size === 0 };
          while (Date.now() < deadline) {
            await purgeInheritedQueue(childId, purgeIds, purgeState);
            const candidate = currentBinding();
            if (candidate?.key === childId && typeof candidate.props?.inputActions?.setDraft === "function") {
              childBinding = candidate;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 150));
          }
          if (!childBinding) {
            clearOptimistic(row);
            sendInFlight = false;
            return;
          }

          // 改名（此时子会话已就绪，rename 才有效）
          if (childTitle) {
            try {
              const childSession = ctx.sessions.binding(childId)?.session;
              if (typeof childSession?.rename === "function") {
                await childSession.rename(childTitle);
              }
            } catch {}
          }

          await purgeInheritedQueue(childId, purgeIds, purgeState);
          try { childBinding.props.inputActions.setDraft(editedText); } catch {}
          if (files.length > 0) {
            try {
              const drafts = ctx.conversation.createDrafts(childId, files);
              if (Array.isArray(drafts) && drafts.length > 0 && typeof childBinding.props.inputActions.addAttachments === "function") {
                const accepted = childBinding.props.inputActions.addAttachments(drafts.map((draft) => draft.id));
                if (accepted === false && typeof ctx.conversation.releaseDraftAttachments === "function") {
                  ctx.conversation.releaseDraftAttachments(drafts);
                }
              }
            } catch {}
          }

          try {
            if (typeof childBinding.props.inputActions.submit === "function") {
              childBinding.props.inputActions.submit();
            }
          } catch {} finally {
            sendInFlight = false;
          }
        }

        // ---------------- 渲染 ----------------
        function injectButtons() {
          const binding = currentBinding();
          void loadBranches().then((records) => {
            syncBranchRows(records);
            void migrateBranchTitles();
          }).catch(() => {});
          const nodes = binding ? userMessageNodes(binding) : [];

          for (const btn of document.querySelectorAll("button[aria-label]")) {
            const label = btn.getAttribute("aria-label") ?? "";
            if (!COPY_LABELS.has(label)) continue;
            if (btn.closest("[data-turn-tail]")) continue;
            const actionsRow = btn.parentElement;
            const row = actionsRow?.parentElement;
            if (!row) continue;
            if (row.hasAttribute("data-pending-steering") || row.hasAttribute("data-submission-echo")) continue;
            if (row.hasAttribute(PROCESSED_ATTR)) continue;
            if (row.querySelector(`[${EDITOR_ATTR}]`)) continue;
            // 定位不到消息节点就不挂按钮（索引回退已弃用）；不设 PROCESSED，下轮 DOM 变化自动重试
            const node = binding ? locateNode(row, nodes) : undefined;
            if (!node) continue;
            row.setAttribute(PROCESSED_ATTR, "1");

            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.setAttribute(BTN_ATTR, "1");
            editBtn.setAttribute("aria-label", t("edit"));
            editBtn.title = t("editTitle");
            editBtn.innerHTML = pencilSvg();
            editBtn.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              beginInlineEdit(row, node);
            });
            actionsRow.insertBefore(editBtn, btn);

            void (async () => {
              try {
                const records = await loadBranches();
                const groups = computeGroups(binding, records);
                if (groups.length === 0) return;
                const msgSeq = node?.data?.seq ?? node?.anchorSeq;
                let group;
                if (binding.key === groups[0].parentId || groups.some((g) => g.parentId === binding.key)) {
                  group = groups.find((g) => g.parentMsgSeq === msgSeq);
                }
                if (!group) {
                  const mine = groups.find((g) => g.versions[g.currentIndex] === binding.key);
                  const mineAnchor = typeof mine?.anchorSeq === "number" ? mine.anchorSeq : -1;
                  if (mine && typeof msgSeq === "number") {
                    const firstNew = nodes.find((n) => {
                      const s = n?.data?.seq ?? n?.anchorSeq;
                      return typeof s === "number" && s > mineAnchor;
                    });
                    if (firstNew && (firstNew?.data?.seq ?? firstNew?.anchorSeq) === msgSeq) group = mine;
                  }
                }
                if (group) {
                  const nav = navElement(group, (targetIndex) => {
                    const target = group.versions[targetIndex];
                    if (target) void switchTo(target);
                  });
                  actionsRow.appendChild(nav);
                }
              } catch {}
            })();
          }
        }

        let scheduled = false;
        const scheduleInject = () => {
          if (scheduled) return;
          scheduled = true;
          let ran = false;
          const run = () => {
            if (ran) return;
            ran = true;
            scheduled = false;
            try { injectButtons(); } catch {}
          };
          requestAnimationFrame(run);
          setTimeout(run, 250); // 窗口隐藏时 rAF 不触发，定时器兜底
        };
        const observer = new MutationObserver(() => {
          try { if (branchCache.at > 0) syncBranchRows(branchCache.records); } catch {}
          scheduleInject();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        injectButtons();

        // 订阅会话切换：打开家族会话时重定向到最近活跃成员（箭头/内部 open 走旁路）
        let unsubscribeCurrent = null;
        try {
          unsubscribeCurrent = ctx.uiSession.adapter.current.subscribe(() => {
            try {
              if (Date.now() < navBypassUntil) return;
              const binding = currentBinding();
              if (!binding) return;
              const members = familyMembersOf(binding.key, branchCache.records);
              if (!members) return;
              const target = mostRecentMemberId(members);
              if (target && target !== binding.key) {
                navBypassUntil = Date.now() + 3000;
                void ctx.sessions.open(target);
              }
            } catch {}
          });
        } catch {}

        // 订阅会话列表：标题/运行状态变化时重归并侧栏；列表就绪后执行标题迁移
        let unsubscribeList = null;
        try {
          unsubscribeList = ctx.sessions.list.subscribe(() => {
            try { if (branchCache.at > 0) syncBranchRows(branchCache.records); } catch {}
            void migrateBranchTitles();
          });
        } catch {}

        ctx.effect(() => () => {
          observer.disconnect();
          unsubscribeCurrent?.();
          unsubscribeList?.();
          closeActiveEditor(true);
        }, "edit-resend: observer");

        // ---------------- 自动总结标题 + 像素微光 ----------------
        try {
          const WAVE_ATTR = "data-at-wave";
          const requestedTitles = new Set(); // `${sessionId}:${kind}` 本页面生命周期只触发一次
          const userNodeCountSeen = new Map(); // sessionId -> 上次观察到的用户消息数（0→1 跳变 = 首条消息）
          let compactionSession = null;
          let compactionBaseline = 0; // 打开/切换会话时的历史 compaction 行数（防懒渲染误触发由宿主端时间窗兜底）
          let lastDetect = 0;

          // 换题模糊过渡：光扫到标题时旧标题模糊 → 新标题落定 → 清晰
          const atStyle = document.createElement("style");
          atStyle.textContent = "[data-at-blur] { filter: blur(3px); opacity: 0.55; transition: filter 180ms ease, opacity 180ms ease; }";
          document.head.appendChild(atStyle);

          /** 配色：抄活体 StateDot 的深蓝（主题换色跟随），光带压暗压温和。 */
          function wavePalette() {
            let base = [86, 134, 254]; // StateDot 深蓝 rgb(86,134,254)
            try {
              const dot = document.querySelector('[data-state="ongoing"]');
              const cell = dot?.querySelector("rect") ?? dot;
              const fill = cell ? getComputedStyle(cell).fill : "";
              const m = fill && fill.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
              if (m) base = [Number(m[1]), Number(m[2]), Number(m[3])];
            } catch {}
            const [r, g, b] = base;
            return {
              grid: `rgba(${r}, ${g}, ${b}, 1)`, // 透明像素格（低 alpha 用）
              light: `rgb(${Math.round(r * 0.55)}, ${Math.round(g * 0.62)}, ${Math.round(b * 0.78)})`, // 微光：温和偏暗
              core: `rgb(${Math.round(r * 0.85)}, ${Math.round(g * 0.88)}, ${Math.round(b * 0.98)})`, // 光芯/被点亮的凸起格：亮一档但仍是深蓝，不刺眼
              shade: "rgba(0, 0, 0, 0.35)", // 凸起格子底下的暗影
            };
          }

          /** 标题落定特效：透明像素格浮现 → 一道暗蓝微光右→左闪过 → 光到之处像素格温和凸起
           *  （体育馆人浪的收敛版），光走远落回 → 格子渐隐。
           *  换题编排：光扫过标题中段时旧标题模糊 → rename 落新标题 → 光走完标题清晰。
           *  canvas 垫在文字下面；侧栏行会被 React 换掉，所以每帧重新找行/挂靠/垫高/补模糊。
           *  setTimeout 链驱动（硬性约束 #6）。 */
          /** 标题落定特效。mode="full"：我方 rename，旧题模糊→扫光中换题→新题清晰（完整编排）；
           *  mode="adapted"：标题已由 dsh 内置落定，不 rename，新题先糊→扫光→转清晰（适配编排）。
           *  blur 清理走 finally + 硬超时双兜底——特效任何路径挂掉都不给标题留糊。 */
          async function playTitleEffect(sessionId, newTitle, mode) {
            const clearBlur = () => {
              for (const el of document.querySelectorAll("[data-at-blur]")) el.removeAttribute("data-at-blur");
            };
            // 硬超时兜底：不随函数返回清除——异常路径上 draw 残链还可能补糊，动画死透后（560+240ms+余量）再扫一次
            const blurCap = setTimeout(clearBlur, 1300);
            try {
              const pal = wavePalette();
              const CELL = 4; // 4px 栅距 + 2px 实心像素（StateDot 同款颗粒：2px 块/2px 缝）
              const SWEEP = 560, FADE = 240, FRAME = 40;
              const start = Date.now();
              const canvas = document.createElement("canvas");
              canvas.setAttribute(WAVE_ATTR, "1");
              canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;z-index:0;border-radius:inherit;";
              const g = canvas.getContext("2d");
              if (!g) return;
              let blurred = false;
              let renameStarted = false;
              const findRow = () => [...document.querySelectorAll('[role="treeitem"][aria-selected="true"]')]
                .filter((r) => !r.querySelector('[class*="_projectText"]'))[0];
              const startRename = () => {
                if (renameStarted) return;
                renameStarted = true;
                void (async () => {
                  // 新会话的 binding/session 偶发未就绪、dsh 自己的 provider 标题也在抢写 → 多重试几次
                  for (let attempt = 0; attempt < 4; attempt++) {
                    try {
                      const session = ctx.sessions.binding(sessionId)?.session;
                      if (typeof session?.rename === "function") {
                        await session.rename(newTitle);
                        break;
                      }
                    } catch {}
                    await new Promise((r) => setTimeout(r, 700));
                  }
                })();
              };
              let rowMissingSince = null;
              const draw = () => {
                const t = Date.now() - start;
                // 按时间收尾；master 只做透明度包络——fade-in 抬到 (t+FRAME)/100，
                // 防 t=0 时包络值为 0 被误判成"动画已结束"而首帧自杀
                if (t > SWEEP + FADE) {
                  canvas.remove();
                  return;
                }
                const master = Math.min(1, (t + FRAME) / 100) * (t > SWEEP ? Math.max(0, 1 - (t - SWEEP) / FADE) : 1);
                const row = findRow();
                // 侧栏重渲染/切换时行会短暂消失：容忍连续 800ms 缺失，超时才收尾
                if (!row) {
                  if (rowMissingSince === null) rowMissingSince = t;
                  if (t - rowMissingSince > 800) { canvas.remove(); return; }
                  setTimeout(draw, FRAME);
                  return;
                }
                rowMissingSince = null;
                const titleEl = row.querySelector('[class*="_title"], [class*="_unreadTitle"]');
                const tx = titleEl?.textContent ?? "";
                // React 会换掉行：每帧重新挂靠 canvas + 把行内子元素垫到特效之上
                if (canvas.parentElement !== row) {
                  if (getComputedStyle(row).position === "static") row.style.position = "relative";
                  row.appendChild(canvas);
                }
                for (const child of row.children) {
                  if (child === canvas) continue;
                  if (getComputedStyle(child).position === "static") child.style.position = "relative";
                  if (child.style.zIndex !== "1") child.style.zIndex = "1";
                }
                const rect = row.getBoundingClientRect();
                const W = Math.floor(rect.width);
                const H = Math.floor(rect.height);
                if (W < 40 || H < 12) { canvas.remove(); return; }
                if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
                const cellsX = Math.ceil(W / CELL);
                const cellsY = Math.ceil(H / CELL);
                const center = cellsX * (1 - t / SWEEP); // 光带中心（格单位），右→左
                if (mode === "adapted") {
                  // 新题已落定：光扫到标题区前先糊住（每帧补挂防 React 换行），光过标题转清晰
                  if (titleEl) {
                    if (center >= cellsX * 0.55) {
                      if (!titleEl.hasAttribute("data-at-blur")) titleEl.setAttribute("data-at-blur", "1");
                    } else if (titleEl.hasAttribute("data-at-blur")) {
                      titleEl.removeAttribute("data-at-blur");
                    }
                  }
                } else {
                  // 光扫到标题中段：开始模糊旧标题 + 落新标题（只一次）
                  if (!blurred && center < cellsX * 0.55) blurred = true;
                  if (blurred) {
                    if (newTitle != null) startRename();
                    // React 会换新标题元素，每帧补模糊，直到文本已变成新标题（新元素天然清晰）
                    if (titleEl && (newTitle == null || tx !== newTitle) && !titleEl.hasAttribute("data-at-blur")) {
                      titleEl.setAttribute("data-at-blur", "1");
                    }
                  }
                }
                g.clearRect(0, 0, W, H);
                // 透明像素格底纹（全行浮现）：2px 实心块 + 2px 缝（StateDot 同款颗粒，50% 空隙率）
                g.fillStyle = pal.grid;
                g.globalAlpha = 0.34 * master;
                for (let cx = 0; cx < cellsX; cx++) {
                  for (let cy = 0; cy < cellsY; cy++) {
                    g.fillRect(cx * CELL, cy * CELL, CELL - 2, CELL - 2);
                  }
                }
                // 光带：深蓝微光柱（温和偏暗），逐像素衰减
                const centerPx = center * CELL;
                for (let dx = -14; dx <= 14; dx++) {
                  const x = Math.round(centerPx + dx);
                  if (x < 0 || x >= W) continue;
                  g.fillStyle = pal.light;
                  g.globalAlpha = (1 - Math.abs(dx) / 14) ** 2 * 0.42 * master;
                  g.fillRect(x, 0, 1, H);
                }
                // 光芯：±1px 亮一档的芯线，给出"一道光闪现"的读感（仍是深蓝、不刺眼）
                for (let dx = -1; dx <= 1; dx++) {
                  const x = Math.round(centerPx + dx);
                  if (x < 0 || x >= W) continue;
                  g.fillStyle = pal.core;
                  g.globalAlpha = (dx === 0 ? 0.62 : 0.32) * master;
                  g.fillRect(x, 0, 1, H);
                }
                // 人浪：光附近的像素格凸起（最多 2px）并点亮，光走远 sin 平滑落回；
                // 凸起格的原位留暗影 = 凹下，读作"整块像素被顶起来"
                for (let cx = 0; cx < cellsX; cx++) {
                  const d = Math.abs(cx - center);
                  if (d > 8) continue;
                  const k = 1 - d / 8;
                  const bump = Math.round(2 * Math.sin((k * Math.PI) / 2)); // 温和起伏
                  for (let cy = 0; cy < cellsY; cy++) {
                    if (bump > 0) {
                      g.fillStyle = pal.shade;
                      g.globalAlpha = 0.4 * k * master;
                      g.fillRect(cx * CELL, cy * CELL, CELL - 2, CELL - 2); // 原位凹下
                    }
                    g.fillStyle = pal.core;
                    g.globalAlpha = (0.3 + k * 0.5) * master;
                    g.fillRect(cx * CELL, cy * CELL - bump, CELL - 2, CELL - 2);
                  }
                }
                g.globalAlpha = 1;
                setTimeout(draw, FRAME);
              };
              draw();
              // 等新标题文本真的落到行上（rename 是异步的），至少等光扫完再清晰；兜底 3s
              if (newTitle != null) {
                const deadline = Date.now() + 3000;
                while (Date.now() < deadline) {
                  const el = findRow()?.querySelector('[class*="_title"], [class*="_unreadTitle"]');
                  if (el?.textContent === newTitle) break;
                  await new Promise((r) => setTimeout(r, 100));
                }
              }
              const remain = SWEEP + 80 - (Date.now() - start);
              if (remain > 0) await new Promise((r) => setTimeout(r, remain));
              blurred = false; // 停止补模糊，新标题元素天然清晰
              clearBlur();
            } catch {
              clearBlur();
            }
          }

          /** 显示卡壳兜底（HANDOFF #18 的 binding 未就绪竞态）：标题真值已落、UI 迟迟没显示时 rename 顶上。
           *  rename 写 kind=user 钉住——宿主侧已把该标题收养进 autotitle.json，后续 compact 不会误判成用户手改。 */
          async function ensureTitleDisplay(sessionId, expected) {
            try {
              const shown = () => {
                try {
                  const s = ctx.sessions.list.getSnapshot()?.byId?.[sessionId];
                  return s?.title === expected || s?.displayTitle === expected;
                } catch { return false; }
              };
              const deadline = Date.now() + 4000;
              while (Date.now() < deadline && !shown()) {
                await new Promise((r) => setTimeout(r, 300));
              }
              if (shown()) return;
              for (let attempt = 0; attempt < 6; attempt++) {
                const session = ctx.sessions.binding(sessionId)?.session;
                if (typeof session?.rename === "function") {
                  try { await session.rename(expected); } catch {}
                  await new Promise((r) => setTimeout(r, 500));
                  if (shown()) return;
                } else {
                  await new Promise((r) => setTimeout(r, 800));
                }
              }
            } catch {}
          }

          async function requestAutoTitle(kind, text) {
            const binding = currentBinding();
            const sessionId = binding?.key;
            if (!sessionId) return;
            const key = `${sessionId}:${kind}`;
            // first 每会话只触发一次；compact 不去重——compaction 行数递增本身就是触发闸（长会话多次压缩应多次更新标题）
            if (kind === "first") {
              if (requestedTitles.has(key)) return;
              requestedTitles.add(key);
            }
            // since = 0→1 触发时刻，给宿主做"标题落定是否发生在本窗口"的新鲜判定（旧会话旧标题 → skip stale-title）
            const since = Date.now();
            try {
              // 分支家族会话不自动总结：标题由 edit-resend 统一成父会话名
              const records = await loadBranches(true);
              if (familyMembersOf(sessionId, records)) return;
              const res = await fetch("/auto-title", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ sessionId, kind, text, since }),
              });
              const payload = await res.json().catch(() => null);
              if (!res.ok || typeof payload?.title !== "string" || !payload.title) return;
              // 内置写题（builtin）标题已落定 → 适配编排（新题糊→扫光→清晰）；我方写题（ours）→ 特效内 rename 的完整编排
              const mode = payload.source === "ours" ? "full" : "adapted";
              await playTitleEffect(sessionId, payload.title, mode);
              await ensureTitleDisplay(sessionId, payload.title);
            } catch {}
          }

          function detectAutoTitleTriggers() {
            try {
              const now = Date.now();
              if (now - lastDetect < 250) return; // 流式期间 DOM 高频变化，节流
              lastDetect = now;
              const binding = currentBinding();
              if (!binding) return;
              // A. 首条消息：用户消息数 0→1 跳变。prevCount 未见过也放行——"建会话即秒发"会漏掉
              //    0 基线观测；旧会话的误触发由宿主 since 新鲜窗口判 stale-title 挡掉
              const nodes = userMessageNodes(binding);
              const prevCount = userNodeCountSeen.get(binding.key);
              userNodeCountSeen.set(binding.key, nodes.length);
              if ((prevCount === 0 || prevCount === undefined) && nodes.length === 1) {
                const { text } = splitContent(nodes[0]?.data?.content);
                const content = text.replace(/\s+/g, " ").trim();
                if (content) void requestAutoTitle("first", content);
              }
              // B. compact：当前会话的 compaction 行数比打开时多（历史行做基线，防旧会话误触发）
              const rows = document.querySelectorAll('[class*="_compactionRow"]').length;
              if (compactionSession !== binding.key) {
                compactionSession = binding.key;
                compactionBaseline = rows;
              } else if (rows > compactionBaseline) {
                compactionBaseline = rows;
                void requestAutoTitle("compact");
              }
            } catch {}
          }

          const atObserver = new MutationObserver(() => {
            try { detectAutoTitleTriggers(); } catch {}
          });
          atObserver.observe(document.body, { childList: true, subtree: true });
          detectAutoTitleTriggers();

          ctx.effect(() => () => {
            atObserver.disconnect();
            atStyle.remove();
            for (const c of document.querySelectorAll(`canvas[${WAVE_ATTR}]`)) c.remove();
          }, "auto-title: observer");
        } catch {}
      },
    };
  },
});
