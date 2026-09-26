/**
 * dsh-client-ui-tweaks — browser half.
 *
 * All DOM interaction lives here: edit buttons, the inline editor, fork-on-send,
 * `‹ n/N ›` branch arrows, sidebar family-row merging, auto-title triggering, and the
 * pixel shimmer effect. Mounted as one ModuleLoader file with independent sections —
 * each section guards its own mount so one failure never takes the others down.
 */
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
      /**
       * Mount every UI section.
       * @param ctx - Client plugin context (uiSession, sessions, conversation, locale, workspaces).
       * @returns {void}
       */
      apply(ctx) {
        try {
          const locale = ctx.get ? ctx.get("locale") : undefined;
          if (locale?.register) {
            ctx.effect(() => locale.register(NS, {
              zh: { edit: "编辑", editTitle: "编辑并重新发送（回填到输入框）" },
              en: { edit: "Edit", editTitle: "Edit and resend (back to composer)" },
            }), "edit-resend: dictionaries");
          }
        } catch { /* no locale service — the t() fallback below covers copy */ }

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

        /**
         * Probe text for a message node: body plus attachment names, so attachment-only
         * messages can still be matched.
         * @param candidate - Chat snapshot node.
         * @returns {string} Normalized probe text.
         */
        function nodeProbeText(candidate) {
          const { text, attachments } = splitContent(candidate?.data?.content);
          const names = attachments.map((a) => a?.desc?.name).filter((n) => typeof n === "string");
          return `${text} ${names.join(" ")}`.replace(/\s+/g, " ").trim();
        }

        // Text matching only: index alignment breaks when context messages interleave,
        // and a button on the wrong message is worse than no button at all.
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
          } catch { /* fetch/parse failure — keep the previous cache */ }
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
          } catch { /* write failed — next load re-reads the old store */ }
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

        /**
         * Walk branch records upward to the root session id and the record this session forked from.
         * @param id - Session id.
         * @param records - Branch records.
         * @returns {{rootId: string, record: object|null}} Root id plus the nearest ancestor record, if any.
         */
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

        /**
         * Seq of the "branch version" message in the current session: for fork branches the
         * first new user message after the anchor; for create branches the first user message.
         * @param binding - Current session binding.
         * @param branchRec - The branch record for this session.
         * @returns {number|null} Message seq, or null when undetermined.
         */
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

        // Bypass window for arrow switches and internal opens: inside it the
        // "most recent member" redirect stays off.
        let navBypassUntil = 0;

        async function switchTo(sessionId) {
          navBypassUntil = Date.now() + 3000;
          try { await ctx.sessions.open(sessionId); } catch { /* open failed — user retries via the row */ }
        }

        /**
         * Family members for a session (root plus every branch, including chained-fork descendants).
         * @param id - Session id.
         * @param records - Branch records.
         * @returns {string[]|null} Member ids, or null when the session is not part of a family.
         */
        function familyMembersOf(id, records) {
          const { rootId } = rootOf(id, records);
          const members = new Set([rootId]);
          for (const r of records) {
            if (typeof r?.parentId !== "string" || typeof r?.childId !== "string") continue;
            if (rootOf(r.parentId, records).rootId !== rootId) continue;
            members.add(r.parentId);
            members.add(r.childId);
          }
          if (members.size <= 1) return null;
          return [...members];
        }

        /**
         * The listed family member with the newest updatedAt — "the branch worked on last".
         * @param members - Family member ids.
         * @returns {string|null} The most recent member still in the session list.
         */
        function mostRecentMemberId(members) {
          let byId = {};
          try { byId = ctx.sessions.list.getSnapshot()?.byId ?? {}; } catch { /* snapshot unavailable — treat as empty */ }
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

        // ---------------- sidebar family row merging ----------------
        // dsh sidebar rows carry no session id (only role="treeitem" + title + relative time),
        // but row title and time come straight from the sessions snapshot: displayTitle +
        // timeLabel(updatedAt). timeLabel is replicated from dsh-client-ui-primitives
        // relativeTime (same buckets and locale templates) so (title, time label) pairs map
        // DOM rows back to sessions even when a cold-start title degrades to the cwd name.
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

        // React fiber bridge: row DOM → session id. Rows carry no id themselves, but
        // SessionNodeItem's props.node.id hangs on the row element's fiber chain — a
        // one-to-one mapping that bypasses (title, time) key collisions entirely.
        // The fiber key is `__reactFiber$<build-hash>`: discover by prefix, never hardcode
        // the hash (the React 16 legacy name is also matched). If a future React changes
        // internals the walk returns null and callers fall back to key matching.
        /**
         * Resolve a sidebar row to its session id through React fiber internals.
         * @param row - Sidebar row element (`role="treeitem"`).
         * @returns {string|null} Session id, or null when fiber introspection is unavailable.
         */
        function sessionIdOfRow(row) {
          try {
            const fiberKey = Object.keys(row).find((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"));
            if (!fiberKey) return null;
            let fiber = row[fiberKey];
            for (let depth = 0; fiber && depth < 12; depth++, fiber = fiber.return) {
              const props = fiber.memoizedProps ?? fiber.pendingProps;
              if (!props || typeof props !== "object") continue;
              // Signature anchor: node.id + onOpen + onRename together identify
              // SessionNodeItem. Search-result rows (result/onOpen) and project rows are
              // excluded by this signature, preventing misattribution.
              const id = props.node?.id;
              if (typeof id === "string" && typeof props.onOpen === "function" && typeof props.onRename === "function") return id;
            }
          } catch { /* fiber walk failed — caller falls back to key matching */ }
          return null;
        }

        /**
         * Exact sidebar mapping: sessionId → row element. Full coverage when the fiber
         * bridge works; empty map otherwise.
         * @returns {Map<string, Element>} Session id to row element.
         */
        function sessionRowsById() {
          const map = new Map();
          for (const row of document.querySelectorAll('[role="treeitem"][aria-selected]')) {
            if (row.querySelector('[class*="_projectText"]')) continue;
            const id = sessionIdOfRow(row);
            if (id && !map.has(id)) map.set(id, row);
          }
          return map;
        }

        /**
         * Keep one visible sidebar row per branch family: current member > running >
         * just completed > most recent. Orphaned hidden rows are restored.
         * @param records - Branch records.
         * @returns {void}
         */
        function syncBranchRows(records) {
          const claimed = new Set();
          try {
            if (!records.length) return;
            let snap;
            try { snap = ctx.sessions.list.getSnapshot(); } catch { return; }
            const byId = snap?.byId ?? {};
            const current = snap?.current;
            // Group families by rootOf: in a chained fork (A→B→C) B is both child and
            // parent, and grouping by direct parentId would split the family in two.
            const families = new Map();
            for (const record of records) {
              if (typeof record?.parentId !== "string" || typeof record?.childId !== "string") continue;
              const { rootId } = rootOf(record.parentId, records);
              if (!families.has(rootId)) families.set(rootId, new Set());
              families.get(rootId).add(record.parentId);
              families.get(rootId).add(record.childId);
            }
            if (families.size === 0) return;
            const rowsById = sessionRowsById();
            const rowsByKey = rowsById.size === 0 ? sessionRowsByKey() : null; // key matching only when fiber introspection is down
            const now = Date.now();
            for (const [rootId, members] of families) {
              const found = [];
              for (const id of members) {
                const summary = byId[id];
                if (!summary || typeof summary.displayTitle !== "string") continue;
                let row = rowsById.get(id) ?? null;
                if (!row && rowsByKey) {
                  // Fallback: (title, time label) key matching. On key collisions prefer the
                  // row whose selection state matches "this id is the current session".
                  const updatedAt = typeof summary.updatedAt === "number" ? summary.updatedAt : 0;
                  const key = `${summary.displayTitle}${timeLabelOf(updatedAt, now)}`;
                  const bucket = (rowsByKey.get(key) ?? []).filter((candidate) => !claimed.has(candidate));
                  row = bucket.find((candidate) => (candidate.getAttribute("aria-selected") === "true") === (id === current)) ?? bucket[0];
                }
                if (!row || claimed.has(row)) continue;
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
          } finally {
            // Self-heal: a row still carrying the hidden mark but unclaimed this round
            // belongs to a deleted record or a dissolved member — show it again. The
            // finally block runs this on early-return paths too.
            for (const row of document.querySelectorAll('[role="treeitem"][aria-selected][data-er-hidden]')) {
              if (claimed.has(row)) continue;
              row.style.display = "";
              row.removeAttribute("data-er-hidden");
            }
          }
        }

        /**
         * One-time migration: rename branch sessions to the root session's title (dropping
         * old "(n)" numbering) and sync the records. Titles always follow the host-read
         * session-log truth — snapshot displayTitle can degrade to the cwd name.
         * @returns {Promise<void>}
         */
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
                try { listed = Boolean(ctx.sessions.list.getSnapshot()?.byId?.[record.childId]); } catch { /* list unavailable — skip rename this pass */ }
                if (listed) {
                  const session = ctx.sessions.binding(record.childId)?.session;
                  if (typeof session?.rename === "function") await session.rename(rootTitle);
                }
              }
              if (record.childTitle !== rootTitle || record.parentTitle !== rootTitle) {
                await postBranch({ ...record, parentTitle: rootTitle, childTitle: rootTitle });
              }
            } catch { /* a broken record must not block migration of the rest */ }
          }
        }

        // ---------------- inline editor ----------------
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

        /**
         * Remove inherited pending-queue messages from a child session (they would replay
         * and re-answer the original question).
         * @param childId - Child session id.
         * @param inheritedIds - Id set to remove precisely (user-queued messages are untouched);
         *   null when the inbox read failed (host fault) and cleanup must degrade to
         *   "remove everything" for safety — over-cleaning beats replay; an empty set means
         *   "confirmed nothing inherited", so nothing is touched.
         * @param state - `{clean}` latch: once confirmed clean (no inherited items, not running)
         *   the running turn is no longer interrupted; null mode never latches clean.
         * @returns {Promise<void>}
         */
        async function purgeInheritedQueue(childId, inheritedIds, state) {
          if (state?.clean) return;
          if (inheritedIds && inheritedIds.size === 0) {
            if (state) state.clean = true;
            return;
          }
          try {
            const session = ctx.sessions.binding(childId)?.session;
            if (!session) return;
            // The queue frame arrives with the open stream; remove inherited items from it.
            const items = typeof session.queueMirror?.snapshot === "function" ? session.queueMirror.snapshot() : [];
            let remaining = 0;
            for (const item of items) {
              const id = item?.id ?? item?.itemId;
              if (!id) continue;
              if (inheritedIds && !inheritedIds.has(id)) continue;
              remaining++;
              if (typeof session.updateQueue === "function") {
                try { await session.updateQueue(id, { kind: "remove" }); } catch { /* already gone — nothing to remove */ }
              }
            }
            // An inherited item may have started a turn: interrupt until clean is confirmed;
            // after that, the user's own running turn is left alone.
            if (session.running === true && typeof session.cancel === "function") {
              try { await session.cancel(); } catch { /* turn already ended */ }
            } else if (inheritedIds && remaining === 0 && session.running !== true) {
              if (state) state.clean = true;
            }
          } catch { /* session not bound yet — the caller polls again */ }
        }

        // ---------------- send: the fork happens here ----------------
        let sendInFlight = false;

        /**
         * Optimistic render: drop the editor, show the edited text bubble plus a
         * processing animation in place.
         * @param row - Message row element.
         * @param editedText - Edited message text.
         * @returns {void}
         */
        function showOptimistic(row, editedText) {
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
          // Restore original content visibility (a no-op once the fork view switch has moved
          // on, but kept as a safety net).
          for (const el of row.querySelectorAll(`[${HIDDEN_ATTR}]`)) {
            el.style.display = '';
            el.removeAttribute(HIDDEN_ATTR);
          }
          activeEditor = null;
        }

        async function sendEdited(row, node, editedText, attachments) {
          if (sendInFlight) return;
          sendInFlight = true;
          // Immediate effect: editor disappears, new bubble + processing animation appear.
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
            } catch { /* unreadable attachment — resend without it */ }
          }

          const msgTurn = node?.location?.turn?.turn;
          const turnStartSeq = node?.location?.turn?.start?.seq;
          // Anchor: the turn/end of the turn *before* the one holding the edited message.
          // No previous turn (first message) means no fork — create a fresh session instead.
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
          } catch { /* snapshot walk failed — treated as "no previous turn", creates a fresh session */ }

          const isFirstMessageBranch = prevTailSeq === undefined;
          let childId = null;
          let atSeqUsed = null;
          if (isFirstMessageBranch) {
            // First message: no history to inherit — create a blank session and make the
            // edited draft its first message.
            try {
              childId = await ctx.sessions.create({});
            } catch { childId = null; /* creation failed — handled by the null check below */ }
          } else {
            const anchors = [prevTailSeq, typeof turnStartSeq === "number" ? turnStartSeq - 2 : undefined, typeof turnStartSeq === "number" ? turnStartSeq - 3 : undefined]
              .filter((atSeq) => typeof atSeq === "number" && atSeq >= 0);
            for (const atSeq of anchors) {
              try {
                childId = await ctx.sessions.fork({ sessionId: sourceId, atSeq, increaseTitle: false });
                atSeqUsed = atSeq;
                break;
              } catch { childId = null; /* bad anchor seq — try the next candidate */ }
            }
          }
          if (childId === null) {
            clearOptimistic(row);
            sendInFlight = false;
            return;
          }

          // Record the branch and give it the family title (deterministic naming for
          // sidebar matching). Attribute it to the root family: parentId = root session,
          // parentMsgSeq = root message seq.
          const recordsNow = await loadBranches(true);
          const { rootId, record: branchRec } = rootOf(sourceId, recordsNow);
          let groupParentMsgSeq = seq;
          if (branchRec) {
            const versionSeq = branchVersionSeq(binding, branchRec);
            if (versionSeq === seq) groupParentMsgSeq = branchRec.parentMsgSeq ?? seq;
          }
          // Family titles unify on the root session's title so header and sidebar agree.
          // Prefer the session-log truth; displayTitle may degrade to the cwd name and is
          // a last resort only.
          const parentTitle = (() => {
            const fromLog = branchCache.titles?.[rootId];
            if (typeof fromLog === "string" && fromLog) return fromLog;
            try {
              const live = ctx.sessions.list.getSnapshot()?.byId?.[rootId];
              if (typeof live?.title === "string" && live.title) return live.title;
              if (typeof live?.displayTitle === "string" && live.displayTitle) return live.displayTitle;
            } catch { /* list unavailable — fall through to the stored record title */ }
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

          // Purge before open: pre-open next-turn queue items in the child log can only be
          // inherited (the user cannot reach the child session yet), so remove exactly the
          // ids the host reported — no text matching (attachment-only messages have empty
          // text and similar prefixes cause false deletes). 404 = log not ready, retry;
          // 200 with an empty array = genuinely nothing inherited, stop polling.
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
              try { await session?.updateQueue?.(id, { kind: "remove" }); } catch { /* already gone */ }
            }
          } catch { /* inbox fetch failed — purge loop below degrades to full cleanup */ }

          navBypassUntil = Date.now() + 15000;
          try { await ctx.sessions.open(childId); } catch { /* open failed — bail via the deadline below */ }

          const deadline = Date.now() + 8000;
          let childBinding = null;
          // Inbox unread (host/log fault) → purgeIds = null and purge degrades to full
          // cleanup as a safety net against replay.
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

          // Rename now (the child session is ready, so rename sticks).
          if (childTitle) {
            try {
              const childSession = ctx.sessions.binding(childId)?.session;
              if (typeof childSession?.rename === "function") {
                await childSession.rename(childTitle);
              }
            } catch { /* rename race — migration retries later */ }
          }

          await purgeInheritedQueue(childId, purgeIds, purgeState);
          try { childBinding.props.inputActions.setDraft(editedText); } catch { /* draft rejected — submit below still sends the buffer */ }
          if (files.length > 0) {
            try {
              const drafts = ctx.conversation.createDrafts(childId, files);
              if (Array.isArray(drafts) && drafts.length > 0 && typeof childBinding.props.inputActions.addAttachments === "function") {
                const accepted = childBinding.props.inputActions.addAttachments(drafts.map((draft) => draft.id));
                if (accepted === false && typeof ctx.conversation.releaseDraftAttachments === "function") {
                  ctx.conversation.releaseDraftAttachments(drafts);
                }
              }
            } catch { /* attachment handoff failed — resend text-only */ }
          }

          try {
            if (typeof childBinding.props.inputActions.submit === "function") {
              childBinding.props.inputActions.submit();
            }
          } catch { /* submit failed — optimistic state already cleared by the caller */ } finally {
            sendInFlight = false;
          }
        }

        // ---------------- rendering ----------------
        /**
         * Inject edit buttons and branch arrows into message rows, and re-merge sidebar
         * family rows. Idempotent per row (rows carry a processed mark).
         * @returns {void}
         */
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
            // No message node, no button (index fallback is abandoned); leave the row
            // unmarked so the next DOM change retries.
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
              } catch { /* records unavailable — arrows appear on the next pass */ }
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
            try { injectButtons(); } catch { /* inject threw — next mutation retries */ }
          };
          requestAnimationFrame(run);
          setTimeout(run, 250); // rAF never fires in hidden windows — timer fallback.
        };
        const observer = new MutationObserver(() => {
          try { if (branchCache.at > 0) syncBranchRows(branchCache.records); } catch { /* merge failure must not break injection */ }
          scheduleInject();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        injectButtons();

        // Subscribe to session switches: opening a family session redirects to the most
        // recently active member (arrow/inner opens go through the bypass window).
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
            } catch { /* redirect failure — user lands on the opened member anyway */ }
          });
        } catch { /* no adapter — redirect simply disabled */ }

        // Subscribe to the session list: re-merge sidebar rows on title/running changes,
        // and run the title migration once the list is ready.
        let unsubscribeList = null;
        try {
          unsubscribeList = ctx.sessions.list.subscribe(() => {
            try { if (branchCache.at > 0) syncBranchRows(branchCache.records); } catch { /* merge failure must not break the subscription */ }
            void migrateBranchTitles();
          });
        } catch { /* no list service — sidebar merge stays observer-driven */ }

        ctx.effect(() => () => {
          observer.disconnect();
          unsubscribeCurrent?.();
          unsubscribeList?.();
          closeActiveEditor(true);
        }, "edit-resend: observer");

        // ---------------- auto summary titles + pixel shimmer ----------------
        try {
          const WAVE_ATTR = "data-at-wave";
          const requestedTitles = new Set(); // `${sessionId}:${kind}` — once per page lifetime
          const userNodeCountSeen = new Map(); // sessionId → last observed user message count (0→1 jump = first message)
          let compactionSession = null;
          let compactionBaseline = 0; // compaction row count at open/switch (host-side time window guards lazy-render false triggers)
          let lastDetect = 0;

          // Title-swap blur transition: old title blurs as the light reaches it → new
          // title lands → sharpens.
          const atStyle = document.createElement("style");
          atStyle.textContent = "[data-at-blur] { filter: blur(3px); opacity: 0.55; transition: filter 180ms ease, opacity 180ms ease; }";
          document.head.appendChild(atStyle);

          /**
           * Palette: the live StateDot deep blue (follows theme recoloring), with the light
           * band dimmed to stay gentle.
           * @returns {{grid: string, light: string, core: string, shade: string}} CSS colors.
           */
          function wavePalette() {
            let base = [86, 134, 254]; // StateDot deep blue rgb(86,134,254)
            try {
              const dot = document.querySelector('[data-state="ongoing"]');
              const cell = dot?.querySelector("rect") ?? dot;
              const fill = cell ? getComputedStyle(cell).fill : "";
              const m = fill && fill.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
              if (m) base = [Number(m[1]), Number(m[2]), Number(m[3])];
            } catch { /* no live dot or unreadable style — keep the default blue */ }
            const [r, g, b] = base;
            return {
              grid: `rgba(${r}, ${g}, ${b}, 1)`, // transparent pixel grid (used at low alpha)
              light: `rgb(${Math.round(r * 0.55)}, ${Math.round(g * 0.62)}, ${Math.round(b * 0.78)})`, // shimmer: gentle and dim
              core: `rgb(${Math.round(r * 0.85)}, ${Math.round(g * 0.88)}, ${Math.round(b * 0.98)})`, // light core / lit bump cells: one step brighter, still deep blue
              shade: "rgba(0, 0, 0, 0.35)", // shadow beneath bumped cells
            };
          }

          /**
           * Title-landing effect: transparent pixel grid surfaces → a dim deep-blue shimmer
           * sweeps right to left → pixel cells under the light bump up gently (a stadium
           * wave, tamed) and settle as the light leaves → grid fades out.
           *
           * mode "full": we rename — old title blurs mid-sweep, the new title lands while
           * the light passes, then sharpens (complete orchestration). mode "adapted": dsh's
           * built-in already settled the title — no rename, the new title starts blurred
           * and sharpens after the sweep.
           *
           * The canvas sits under the text. React replaces sidebar rows wholesale, so each
           * frame re-finds the row, re-attaches the canvas, re-lifts children, and re-applies
           * blur. Driven by a setTimeout chain because rAF stalls in hidden windows.
           * Blur cleanup is double-guarded (finally + hard timeout) so no failure path
           * leaves the title blurred.
           * @param sessionId - Session whose row plays the effect.
           * @param newTitle - The landing title, or null for a pure visual pass.
           * @param mode - "full" or "adapted".
           * @returns {Promise<void>}
           */
          async function playTitleEffect(sessionId, newTitle, mode) {
            const clearBlur = () => {
              for (const el of document.querySelectorAll("[data-at-blur]")) el.removeAttribute("data-at-blur");
            };
            // Hard-timeout fallback, deliberately not cleared on return: a residual draw
            // chain on an exception path may re-apply blur, so sweep once more after the
            // animation is surely dead (560+240ms + margin).
            const blurCap = setTimeout(clearBlur, 1300);
            try {
              const pal = wavePalette();
              const CELL = 4; // 4px grid pitch + 2px solid pixels (StateDot grain: 2px blocks, 2px gaps)
              const SWEEP = 560, FADE = 240, FRAME = 40;
              const LIGHT_HALF = 32; // light band half-width px (includes soft-shoulder falloff)
              const LIGHT_SHEAR = 20; // light shear px: positive = "/" slant (top right), negative = "\"
              const BUMP_MAX = 4; // wave bump cap px (even multiple of the pitch keeps grid lines aligned)
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
                  // A new session's binding/session may not be ready yet, and dsh's own
                  // provider title is racing us — retry a few times.
                  for (let attempt = 0; attempt < 4; attempt++) {
                    try {
                      const session = ctx.sessions.binding(sessionId)?.session;
                      if (typeof session?.rename === "function") {
                        await session.rename(newTitle);
                        break;
                      }
                    } catch { /* binding not ready yet — retry */ }
                    await new Promise((r) => setTimeout(r, 700));
                  }
                })();
              };
              let rowMissingSince = null;
              const draw = () => {
                // End in place on a mid-sweep session switch: findRow targets the aria-selected
                // row, which belongs to someone else after switching. A transiently missing
                // binding (readiness race) is not a switch — only a definite key change is.
                const cur = currentBinding();
                if (cur && cur.key !== sessionId) {
                  canvas.remove();
                  clearBlur();
                  return;
                }
                const t = Date.now() - start;
                // Terminate on time only. master is a pure opacity envelope — the fade-in
                // is lifted to (t+FRAME)/100 so the envelope is never 0 at t=0, which was
                // misread as "animation finished" and killed the effect on its first frame.
                if (t > SWEEP + FADE) {
                  canvas.remove();
                  return;
                }
                const master = Math.min(1, (t + FRAME) / 100) * (t > SWEEP ? Math.max(0, 1 - (t - SWEEP) / FADE) : 1);
                const row = findRow();
                // Rows vanish briefly on sidebar re-render/switch: tolerate up to 800ms of
                // absence before ending.
                if (!row) {
                  if (rowMissingSince === null) rowMissingSince = t;
                  if (t - rowMissingSince > 800) { canvas.remove(); return; }
                  setTimeout(draw, FRAME);
                  return;
                }
                rowMissingSince = null;
                const titleEl = row.querySelector('[class*="_title"], [class*="_unreadTitle"]');
                const tx = titleEl?.textContent ?? "";
                // React replaces rows wholesale: re-attach the canvas and lift row children
                // above the effect every frame.
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
                const center = cellsX * (1 - t / SWEEP); // band center in cells, sweeping right to left
                if (mode === "adapted") {
                  // Title already landed: blur before the light reaches the title area
                  // (re-applied per frame against React row swaps), sharpen after it passes.
                  if (titleEl) {
                    if (center >= cellsX * 0.55) {
                      if (!titleEl.hasAttribute("data-at-blur")) titleEl.setAttribute("data-at-blur", "1");
                    } else if (titleEl.hasAttribute("data-at-blur")) {
                      titleEl.removeAttribute("data-at-blur");
                    }
                  }
                } else {
                  // Light reaches the title's middle: blur the old title and land the new
                  // one (once).
                  if (!blurred && center < cellsX * 0.55) blurred = true;
                  if (blurred) {
                    if (newTitle != null) startRename();
                    // React swaps in a fresh title element; re-apply blur every frame until
                    // the text is the new title (the new element starts sharp).
                    if (titleEl && (newTitle == null || tx !== newTitle) && !titleEl.hasAttribute("data-at-blur")) {
                      titleEl.setAttribute("data-at-blur", "1");
                    }
                  }
                }
                g.clearRect(0, 0, W, H);
                // Transparent pixel-grid texture across the row: 2px solid blocks on a 2px
                // gap (StateDot grain, 50% void ratio).
                g.fillStyle = pal.grid;
                g.globalAlpha = 0.34 * master;
                for (let cx = 0; cx < cellsX; cx++) {
                  for (let cy = 0; cy < cellsY; cy++) {
                    g.fillRect(cx * CELL, cy * CELL, CELL - 2, CELL - 2);
                  }
                }
                // Light band: sheared parallelogram (pixel-stepped diagonal — 2px integer
                // steps per row keep the edge hard), per-pixel soft-shoulder falloff.
                // Top-right/bottom-left = "/" slant (negate LIGHT_SHEAR for "\"); the whole
                // band moves right to left during the sweep.
                const centerPx = center * CELL;
                for (let y = 0; y < H; y++) {
                  const shear = Math.round((LIGHT_SHEAR * (0.5 - y / Math.max(1, H - 1))) / 2) * 2;
                  const rowCenter = centerPx + shear;
                  for (let dx = -LIGHT_HALF; dx <= LIGHT_HALF; dx++) {
                    const x = Math.round(rowCenter + dx);
                    if (x < 0 || x >= W) continue;
                    g.fillStyle = pal.light;
                    g.globalAlpha = (1 - Math.abs(dx) / LIGHT_HALF) ** 2 * 0.42 * master;
                    g.fillRect(x, y, 1, 1);
                  }
                  // Core line: a brighter core following the shear (±1px symmetric) for the
                  // read of a single light flash (still deep blue, never glaring).
                  for (let dx = -1; dx <= 1; dx++) {
                    const x = Math.round(rowCenter) + dx;
                    if (x < 0 || x >= W) continue;
                    g.fillStyle = pal.core;
                    g.globalAlpha = (dx === 0 ? 0.62 : 0.32) * master;
                    g.fillRect(x, y, 1, 1);
                  }
                }
                // Wave: cells near the light bump up (BUMP_MAX, whole-pitch steps) and light
                // up, settling smoothly with sin as the light leaves; the vacated spot keeps
                // a shadow so the block reads as physically lifted.
                for (let cx = 0; cx < cellsX; cx++) {
                  const d = Math.abs(cx - center);
                  if (d > 8) continue;
                  const k = 1 - d / 8;
                  const bump = Math.round((BUMP_MAX / 2) * Math.sin((k * Math.PI) / 2)) * 2; // 0..BUMP_MAX, 2px steps
                  for (let cy = 0; cy < cellsY; cy++) {
                    if (bump > 0) {
                      g.fillStyle = pal.shade;
                      g.globalAlpha = 0.4 * k * master;
                      g.fillRect(cx * CELL, cy * CELL, CELL - 2, CELL - 2); // vacated spot shadow
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
              // Wait until the new title text really lands on the row (rename is async),
              // and at least until the sweep finishes before sharpening; 3s cap.
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
              blurred = false; // stop re-applying blur — the new title element starts sharp
              clearBlur();
            } catch {
              clearBlur();
            }
          }

          /**
           * Display jam fallback for the binding-readiness race: when the title truth has
           * landed but the UI never shows it, force it through rename. Rename writes
           * kind "user" (pinned) — the host already recorded the title in autotitle.json,
           * so later compact passes do not misread it as a manual rename.
           * @param sessionId - Session id.
           * @param expected - The title that must become visible.
           * @returns {Promise<void>}
           */
          async function ensureTitleDisplay(sessionId, expected) {
            try {
              const shown = () => {
                try {
                  const s = ctx.sessions.list.getSnapshot()?.byId?.[sessionId];
                  return s?.title === expected || s?.displayTitle === expected;
                } catch { return false; /* list unavailable — keep waiting */ }
              };
              const deadline = Date.now() + 4000;
              while (Date.now() < deadline && !shown()) {
                await new Promise((r) => setTimeout(r, 300));
              }
              if (shown()) return;
              for (let attempt = 0; attempt < 6; attempt++) {
                const session = ctx.sessions.binding(sessionId)?.session;
                if (typeof session?.rename === "function") {
                  try { await session.rename(expected); } catch { /* rename race — retry */ }
                  await new Promise((r) => setTimeout(r, 500));
                  if (shown()) return;
                } else {
                  await new Promise((r) => setTimeout(r, 800));
                }
              }
            } catch { /* display check failed — title truth is host-side, safe to stop */ }
          }

          /**
           * Request a title from the host and play the effect with the result.
           * @param kind - "first" or "compact".
           * @returns {Promise<void>}
           */
          async function requestAutoTitle(kind) {
            const binding = currentBinding();
            const sessionId = binding?.key;
            if (!sessionId) return;
            const key = `${sessionId}:${kind}`;
            // "first" fires once per session; "compact" never dedupes — the rising
            // compaction-row count is itself the gate (long sessions retitle on each compaction).
            if (kind === "first") {
              if (requestedTitles.has(key)) return;
              requestedTitles.add(key);
            }
            // since = the 0→1 trigger instant, so the host can freshness-check "did the title
            // settle inside this window" (old titles of old sessions skip as stale-title).
            const since = Date.now();
            try {
              // Branch-family sessions skip auto-titling: edit-resend unifies their titles
              // to the parent session's name.
              const records = await loadBranches(true);
              if (familyMembersOf(sessionId, records)) return;
              const res = await fetch("/auto-title", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ sessionId, kind, since }),
              });
              const payload = await res.json().catch(() => null);
              if (!res.ok || typeof payload?.title !== "string" || !payload.title) return;
              // Built-in title (source "builtin") already settled → adapted orchestration
              // (blur → sweep → sharp); our own title (source "ours") → full orchestration
              // with the rename inside the effect.
              const mode = payload.source === "ours" ? "full" : "adapted";
              await playTitleEffect(sessionId, payload.title, mode);
              await ensureTitleDisplay(sessionId, payload.title);
            } catch { /* request/parse failure — title falls back to host/provider display */ }
          }

          function detectAutoTitleTriggers() {
            try {
              const now = Date.now();
              if (now - lastDetect < 250) return; // streaming churns the DOM — throttle
              lastDetect = now;
              const binding = currentBinding();
              if (!binding) return;
              // A. First message: a 0→1 jump in user message count. An unseen prevCount also
              //    fires — "type the first message right after creating the session" would
              //    otherwise miss its 0 baseline; stale titles from old sessions are blocked
              //    by the host's since freshness window.
              const nodes = userMessageNodes(binding);
              const prevCount = userNodeCountSeen.get(binding.key);
              userNodeCountSeen.set(binding.key, nodes.length);
              if ((prevCount === 0 || prevCount === undefined) && nodes.length === 1) {
                // Fire on 0→1 without inspecting content. An earlier `if (content)` gate
                // swallowed the observation of empty-content nodes (the count had already
                // incremented) and the trigger was lost forever; material comes from the
                // session log host-side anyway.
                void requestAutoTitle("first");
              }
              // B. compact: compaction row count grew since open (history rows form the
              // baseline, so old sessions do not false-trigger).
              const rows = document.querySelectorAll('[class*="_compactionRow"]').length;
              if (compactionSession !== binding.key) {
                compactionSession = binding.key;
                compactionBaseline = rows;
              } else if (rows > compactionBaseline) {
                compactionBaseline = rows;
                void requestAutoTitle("compact");
              }
            } catch { /* detection failure must not break future triggers */ }
          }

          const atObserver = new MutationObserver(() => {
            try { detectAutoTitleTriggers(); } catch { /* detection failure must not break the observer */ }
          });
          atObserver.observe(document.body, { childList: true, subtree: true });
          detectAutoTitleTriggers();

          ctx.effect(() => () => {
            atObserver.disconnect();
            atStyle.remove();
            for (const c of document.querySelectorAll(`canvas[${WAVE_ATTR}]`)) c.remove();
          }, "auto-title: observer");
        } catch { /* auto-title section failed to mount — the rest of the plugin stays up */ }
      },
    };
  },
});
