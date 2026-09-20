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

        function collectRows() {
          const rows = [];
          for (const btn of document.querySelectorAll("button[aria-label]")) {
            const label = btn.getAttribute("aria-label") ?? "";
            if (!COPY_LABELS.has(label)) continue;
            if (btn.closest("[data-turn-tail]")) continue;
            if (btn.hasAttribute(BTN_ATTR)) continue;
            const actionsRow = btn.parentElement;
            const row = actionsRow?.parentElement;
            if (!row) continue;
            if (row.hasAttribute("data-pending-steering") || row.hasAttribute("data-submission-echo")) continue;
            if (!rows.includes(row)) rows.push(row);
          }
          return rows;
        }

        function locateNode(binding, row, rows, nodes) {
          const index = rows.indexOf(row);
          // 文本匹配优先（索引映射在 context 消息穿插时不可靠）
          const rowText = (row.textContent ?? "").replace(/\s+/g, " ").trim();
          let node;
          if (rowText.length >= 12) {
            node = nodes.find((candidate) => {
              const { text } = splitContent(candidate?.data?.content);
              const probe = text.replace(/\s+/g, " ").trim();
              return probe !== "" && (rowText.includes(probe.slice(0, Math.min(60, probe.length))) || probe.includes(rowText.slice(0, Math.min(60, rowText.length))));
            });
          }
          if (!node && index >= 0) node = nodes[index];
          return { node, index };
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
              const row = (rowsByKey.get(key) ?? []).find((candidate) => !claimed.has(candidate));
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

        /** 清除子会话里继承来的"待处理队列消息"（防止重放原问题导致重答）。 */
        async function purgeInheritedQueue(childId) {
          try {
            const session = ctx.sessions.binding(childId)?.session;
            if (!session) return;
            // 已在跑的重放回合：先打断
            try {
              if (session.running === true && typeof session.cancel === "function") {
                await session.cancel();
              }
            } catch {}
            // 队列帧到达后（open 流式下发），移除其中的待处理项（含继承来的原问题）
            const items = typeof session.queueMirror?.snapshot === "function" ? session.queueMirror.snapshot() : [];
            for (const item of items) {
              const id = item?.id ?? item?.itemId;
              if (!id) continue;
              if (typeof session.updateQueue === "function") {
                try { await session.updateQueue(id, { kind: "remove" }); } catch {}
              }
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
          if (typeof seq !== "number") return;

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

          // 先清后开：从日志读出继承的 next-turn 队列项 id，逐一从 agent inbox 移除
          try {
            const originalText = splitContent(node?.data?.content).text.replace(/\s+/g, " ").trim();
            let items = [];
            for (let attempt = 0; attempt < 10 && items.length === 0; attempt++) {
              const res = await fetch("/edit-resend-inbox", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ sessionId: childId }),
              });
              const payload = await res.json();
              items = Array.isArray(payload?.items) ? payload.items : [];
              if (items.length === 0) await new Promise((resolve) => setTimeout(resolve, 200));
            }
            const session = ctx.sessions.binding(childId)?.session;
            for (const item of items) {
              if (!item?.id) continue;
              // 只删继承来的原问题（不删之后自己提交的）
              if (originalText !== "" && (item.text ?? "").replace(/\s+/g, " ").trim().includes(originalText.slice(0, 30))) {
                if (typeof session?.updateQueue === "function") {
                  try {
                    await session.updateQueue(item.id, { kind: "remove" });
                  } catch {}
                }
              }
            }
          } catch {}

          navBypassUntil = Date.now() + 15000;
          try { await ctx.sessions.open(childId); } catch {}

          const deadline = Date.now() + 8000;
          let childBinding = null;
          while (Date.now() < deadline) {
            await purgeInheritedQueue(childId);
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

          await purgeInheritedQueue(childId);
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
          const rows = collectRows();
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
            row.setAttribute(PROCESSED_ATTR, "1");

            const located = binding ? locateNode(binding, row, rows, nodes) : { node: undefined };

            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.setAttribute(BTN_ATTR, "1");
            editBtn.setAttribute("aria-label", t("edit"));
            editBtn.title = t("editTitle");
            editBtn.innerHTML = pencilSvg();
            editBtn.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (located.node) beginInlineEdit(row, located.node);
            });
            actionsRow.insertBefore(editBtn, btn);

            if (!binding) continue;
            void (async () => {
              try {
                const records = await loadBranches();
                const groups = computeGroups(binding, records);
                if (groups.length === 0) return;
                const msgSeq = located.node?.data?.seq ?? located.node?.anchorSeq;
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
      },
    };
  },
});
