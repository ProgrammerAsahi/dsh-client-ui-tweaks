/**
 * dsh-client-ui-tweaks — host half.
 *
 * 三条职责：
 * 1. 让 cordis 包契约成立（滑块同款）。
 * 2. /edit-resend-branches：分支记录（childId/parentId/parentMsgSeq/anchorSeq/createdAt）读写，
 *    并从会话日志读出各会话的持久标题（session/title 事件真值）一并返回。
 * 3. /edit-resend-inbox：读取子会话日志中、最后一个 turn/end 之后经 next-turn splice
 *    排队的消息（供客户端在 open 之前移除，防止继承队列导致的原问题重放/重答）。
 */
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

/** Stable Cordis plugin name. */
export const name = "dsh-client-ui-tweaks";
/** Services required before the JSON route can be mounted. */
export const inject = ["webServer"];

const execFileAsync = promisify(execFile);
const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const STORE = join(pluginRoot, "branches.json");

/** dsh 家目录定位：优先 ~/.dsh（桌面版与网页版共享的家目录软链），回退到插件上两级。 */
let sessionsRootPromise = null;
function resolveSessionsRoot() {
  if (!sessionsRootPromise) {
    sessionsRootPromise = (async () => {
      for (const home of [join(homedir(), ".dsh"), resolve(pluginRoot, "..", "..")]) {
        try {
          const candidate = join(home, "sessions");
          if ((await stat(candidate)).isDirectory()) return candidate;
        } catch {}
      }
      return join(homedir(), ".dsh", "sessions");
    })();
  }
  return sessionsRootPromise;
}

async function readStore() {
  try {
    const parsed = JSON.parse(await readFile(STORE, "utf8"));
    return Array.isArray(parsed?.branches) ? parsed.branches : [];
  } catch {
    return [];
  }
}

async function writeStore(branches) {
  await mkdir(pluginRoot, { recursive: true });
  await writeFile(STORE, JSON.stringify({ version: 1, branches }, null, 2));
}

// 日志文件名候选：v3 现行格式 + v0 旧名；再兜底目录内任意 .jsonl.zstd，防未来格式改名静默失效
const LOG_NAMES = ["session.v3.jsonl.zstd", "session.jsonl.zstd"];
async function findSessionLog(sessionId) {
  const sessionsRoot = await resolveSessionsRoot();
  for (const ws of await readdir(sessionsRoot)) {
    const dir = join(sessionsRoot, ws, sessionId);
    for (const name of LOG_NAMES) {
      const candidate = join(dir, name);
      try {
        if ((await stat(candidate)).isFile()) return candidate;
      } catch {}
    }
    try {
      const fallback = (await readdir(dir)).filter((n) => n.endsWith(".jsonl.zstd")).sort().pop();
      if (fallback) return join(dir, fallback);
    } catch {}
  }
  return null;
}

/** 会话的持久标题（日志里最后一条 session/title 事件），按日志 mtime 缓存。
 *  流式扫描，不把整个解压结果读进内存（长会话日志可达几十 MB）。 */
const titleCache = new Map();
async function readSessionTitle(sessionId) {
  const log = await findSessionLog(sessionId);
  if (!log) return undefined;
  const { mtimeMs } = await stat(log);
  const hit = titleCache.get(sessionId);
  if (hit && hit.mtimeMs === mtimeMs) return hit.title;
  const title = await new Promise((resolve, reject) => {
    const child = spawn("zstd", ["-d", "-c", log]);
    let tail = "";
    let last;
    const scan = (line) => {
      if (!line.includes('"session/title"')) return;
      try {
        const event = JSON.parse(line);
        if (event?.type === "session/title" && typeof event?.data?.title === "string") last = event.data.title;
      } catch {}
    };
    child.stdout.on("data", (chunk) => {
      tail += chunk;
      let idx;
      while ((idx = tail.indexOf("\n")) >= 0) {
        scan(tail.slice(0, idx));
        tail = tail.slice(idx + 1);
      }
    });
    child.on("error", reject);
    child.on("close", () => {
      if (tail) scan(tail);
      resolve(last);
    });
  });
  titleCache.set(sessionId, { mtimeMs, title });
  return title;
}

/** 读取会话日志里、最后一个 turn/end 之后经 next-turn splice 排队的消息。
 *  日志不存在返回 null（区别于"日志在但没排队项"的空数组，供调用方区分重试）。 */
async function listInboxQueued(sessionId) {
  const log = await findSessionLog(sessionId);
  if (!log) return null;
  const { stdout } = await execFileAsync("zstd", ["-d", "-c", log], { maxBuffer: 64 * 1024 * 1024 });
  const events = stdout.split("\n").filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
  let lastTurnEnd = -1;
  events.forEach((e, i) => { if (e?.type === "turn/end") lastTurnEnd = i; });
  const items = [];
  for (let i = Math.max(0, lastTurnEnd); i < events.length; i++) {
    const e = events[i];
    if (e?.type !== "agent/inbox/spliced") continue;
    if (e?.data?.target !== "next-turn") continue;
    const inserted = Array.isArray(e?.data?.inserted) ? e.data.inserted : [];
    for (const msg of inserted) {
      const text = (msg?.content ?? []).filter((b) => b?.type === "text").map((b) => b.text).join("");
      if (msg?.id) items.push({ id: msg.id, text });
    }
  }
  return items;
}

// ---------------- /auto-title：自动总结标题 ----------------
const AUTOTITLE_STORE = join(pluginRoot, "autotitle.json");
const TITLE_PROMPT_FILE = join(pluginRoot, "prompts", "title.txt");
const KIMI_CREDENTIALS_FILE = join(homedir(), ".kimi-code", "credentials", "kimi-code.json");
const KIMI_MESSAGES_URL = "https://api.kimi.com/coding/v1/messages";
const AUTOTITLE_MODEL = "k3";
const FALLBACK_TITLE_PROMPT = "你是会话标题生成器。把给定内容总结成一个简短的会话标题：中文不超过 15 字，英文不超过 6 个单词；只输出标题本身，不带引号、不换行、末尾不加标点；语言跟随内容。";

async function readAutotitles() {
  try {
    const parsed = JSON.parse(await readFile(AUTOTITLE_STORE, "utf8"));
    return parsed?.titles && typeof parsed.titles === "object" ? parsed.titles : {};
  } catch {
    return {};
  }
}

async function writeAutotitles(titles) {
  await writeFile(AUTOTITLE_STORE, JSON.stringify({ version: 1, titles }, null, 2));
}

let titlePromptCache = { mtimeMs: -1, text: "" };
async function readTitlePrompt() {
  try {
    const { mtimeMs } = await stat(TITLE_PROMPT_FILE);
    if (titlePromptCache.mtimeMs === mtimeMs) return titlePromptCache.text;
    const text = await readFile(TITLE_PROMPT_FILE, "utf8");
    titlePromptCache = { mtimeMs, text };
    return text;
  } catch {
    return FALLBACK_TITLE_PROMPT;
  }
}

/** 最后一条 session/title 事件的 {title, kind}（kind: fallback|provider|user，user=钉住）。流式扫描。 */
async function readSessionTitleFull(sessionId) {
  const log = await findSessionLog(sessionId);
  if (!log) return undefined;
  return new Promise((resolve, reject) => {
    const child = spawn("zstd", ["-d", "-c", log]);
    let tail = "";
    let last;
    const scan = (line) => {
      if (!line.includes('"session/title"')) return;
      try {
        const event = JSON.parse(line);
        if (event?.type === "session/title" && typeof event?.data?.title === "string") {
          last = { title: event.data.title, kind: event?.data?.source?.kind };
        }
      } catch {}
    };
    child.stdout.on("data", (chunk) => {
      tail += chunk;
      let idx;
      while ((idx = tail.indexOf("\n")) >= 0) {
        scan(tail.slice(0, idx));
        tail = tail.slice(idx + 1);
      }
    });
    child.on("error", reject);
    child.on("close", () => {
      if (tail) scan(tail);
      resolve(last);
    });
  });
}

async function loadSessionEvents(sessionId) {
  const log = await findSessionLog(sessionId);
  if (!log) return null;
  const { stdout } = await execFileAsync("zstd", ["-d", "-c", log], { maxBuffer: 64 * 1024 * 1024 });
  return stdout.split("\n").filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

/** 等最近一次 compaction/end flush 进日志，取对应 compaction/summary 的文本（压缩前对话的总结）。
 *  兜底：压缩点之前的 user/assistant 消息原文（截前 4k + 后 4k）。 */
async function waitCompactionSummary(sessionId, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = await loadSessionEvents(sessionId);
    if (events) {
      let end;
      for (const e of events) {
        if (e?.type === "compaction/end") end = e;
      }
      if (end) {
        // 只响应刚刚发生的压缩：历史压缩行在滚动懒渲染时会再次进 DOM，靠时间窗挡掉
        if (typeof end?.time === "number" && Date.now() - end.time > 180_000) return null;
        const compactionId = end?.data?.compactionId;
        const summaryEvent = events.find((e) => e?.type === "compaction/summary" && e?.data?.compactionId === compactionId);
        const blocks = Array.isArray(summaryEvent?.data?.summary) ? summaryEvent.data.summary : [];
        const text = blocks.filter((b) => b?.type === "text").map((b) => b.text).join("\n").trim();
        if (text) return text;
        const startSeq = events.find((e) => e?.type === "compaction/start" && e?.data?.compactionId === compactionId)?.seq;
        const chunks = [];
        for (const e of events) {
          if (typeof startSeq === "number" && typeof e?.seq === "number" && e.seq >= startSeq) break;
          // 用户消息只取真人发的（kind:"user"），跳过 agent-instructions/plugin/skill-catalog 注入
          const content = e?.type === "user/message" && e?.data?.source?.kind === "user" ? e?.data?.content : e?.type === "assistant/message" ? e?.data?.message?.content : undefined;
          if (!Array.isArray(content)) continue;
          const t = content.filter((b) => b?.type === "text").map((b) => b.text).join("");
          if (t) chunks.push(t);
        }
        const raw = chunks.join("\n");
        if (raw.length > 8000) return raw.slice(0, 4000) + "\n…\n" + raw.slice(-4000);
        return raw || null;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

/** 等首条 user/message flush 进日志，并确认"真·首条"：日志里恰好 1 条用户消息且发生在 10 分钟内。
 *  打开旧会话时客户端快照异步加载也会出现 0→1 假象，靠这里挡住。 */
async function waitFirstUserMessage(sessionId, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = await loadSessionEvents(sessionId);
    if (events) {
      const userMsgs = events.filter((e) => e?.type === "user/message" && e?.data?.source?.kind === "user");
      if (userMsgs.length > 0) {
        const firstTime = userMsgs[0]?.time;
        const fresh = typeof firstTime === "number" && Date.now() - firstTime <= 10 * 60 * 1000;
        return userMsgs.length === 1 && fresh;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

function sanitizeTitle(raw) {
  if (typeof raw !== "string") return "";
  let t = raw.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  t = t.replace(/^[「『"'`《<#\s]+/, "").replace(/[」』"'`》>\s。！？!?.，、；;:：,;]+$/, "");
  return Array.from(t).slice(0, 30).join("").trim();
}

/** 调 Kimi K3（最低思考档 low）生成标题。凭据只读：过期直接放弃，绝不 refresh——
 *  refresh 会轮换 refresh_token，和 harness/CLI 抢写会顶掉登录。
 *  触发时机天然保新鲜：用户发消息/跑 compact 时 harness 自己就在调模型。 */
async function kimiTitle(material) {
  const cred = JSON.parse(await readFile(KIMI_CREDENTIALS_FILE, "utf8"));
  const token = cred?.access_token;
  if (typeof token !== "string" || !token) throw new Error("no kimi-coding token");
  const expiresAtMs = typeof cred?.expires_at === "number" ? cred.expires_at * 1000 : 0;
  if (expiresAtMs <= Date.now() + 30_000) throw new Error("token-stale");
  const prompt = await readTitlePrompt();
  const res = await fetch(KIMI_MESSAGES_URL, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${token}`,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify({
      model: AUTOTITLE_MODEL,
      // 思考链也吃 max_tokens：64 会被偶发的长 thinking 耗光导致无 text 块，512 兜底（输出本身只有十几个字）
      max_tokens: 512,
      stream: false,
      messages: [{ role: "user", content: `${prompt}\n\n---\n\n${material}` }],
      thinking: { type: "adaptive", display: "summarized" },
      output_config: { effort: "low" },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`kimi ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  const text = (body?.content ?? []).filter((b) => b?.type === "text").map((b) => b.text).join("");
  return sanitizeTitle(text);
}

const autoTitleInFlight = new Set();

/**
 * @param ctx - host plugin context carrying the `webServer` service.
 */
export function apply(ctx) {
  ctx.effect(() =>
    ctx.webServer.register({
      kind: "prefix",
      path: "/edit-resend-branches",
      handler: async (req, res) => {
        const send = (status, body) => {
          const text = typeof body === "string" ? body : JSON.stringify(body);
          res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
          res.end(text);
        };
        if (req.method === "GET") {
          const branches = await readStore();
          const ids = new Set();
          for (const b of branches) {
            if (typeof b?.parentId === "string") ids.add(b.parentId);
            if (typeof b?.childId === "string") ids.add(b.childId);
          }
          const titles = {};
          for (const id of ids) {
            try {
              const title = await readSessionTitle(id);
              if (typeof title === "string") titles[id] = title;
            } catch {}
          }
          send(200, { branches, titles });
          return;
        }
        if (req.method === "POST") {
          let text = "";
          for await (const chunk of req) text += chunk;
          let body;
          try {
            body = JSON.parse(text);
          } catch {
            send(400, { error: "body is not JSON" });
            return;
          }
          const record = body?.record;
          if (!record || typeof record.childId !== "string" || typeof record.parentId !== "string") {
            send(400, { error: "record requires childId and parentId" });
            return;
          }
          const branches = await readStore();
          const next = branches.filter(
            (entry) => !(entry.childId === record.childId || (entry.parentId === record.parentId && entry.parentMsgSeq === record.parentMsgSeq && entry.childId === record.childId)),
          );
          next.push({
            childId: record.childId,
            parentId: record.parentId,
            parentTitle: typeof record.parentTitle === "string" ? record.parentTitle : null,
            childTitle: typeof record.childTitle === "string" ? record.childTitle : null,
            parentMsgSeq: typeof record.parentMsgSeq === "number" ? record.parentMsgSeq : null,
            anchorSeq: typeof record.anchorSeq === "number" ? record.anchorSeq : null,
            createdAt: typeof record.createdAt === "number" ? record.createdAt : Date.now(),
          });
          await writeStore(next);
          send(200, { ok: true, branches: next.length });
          return;
        }
        send(405, { error: "method not allowed" });
      },
    }),
    "edit-resend: branches route",
  );
  ctx.effect(() =>
    ctx.webServer.register({
      kind: "prefix",
      path: "/edit-resend-inbox",
      handler: async (req, res) => {
        const send = (status, body) => {
          res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
          res.end(JSON.stringify(body));
        };
        if (req.method !== "POST") {
          send(405, { error: "method not allowed" });
          return;
        }
        let text = "";
        for await (const chunk of req) text += chunk;
        let body;
        try { body = JSON.parse(text); } catch { send(400, { error: "body is not JSON" }); return; }
        if (typeof body?.sessionId !== "string") {
          send(400, { error: "sessionId required" });
          return;
        }
        try {
          const items = await listInboxQueued(body.sessionId);
          if (items === null) {
            send(404, { error: "session log not found" });
            return;
          }
          send(200, { items });
        } catch (error) {
          send(500, { error: String(error?.message ?? error) });
        }
      },
    }),
    "edit-resend: inbox route",
  );
  ctx.effect(() =>
    ctx.webServer.register({
      kind: "prefix",
      path: "/auto-title",
      handler: async (req, res) => {
        const send = (status, body) => {
          res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
          res.end(JSON.stringify(body));
        };
        if (req.method !== "POST") {
          send(405, { error: "method not allowed" });
          return;
        }
        let text = "";
        for await (const chunk of req) text += chunk;
        let body;
        try { body = JSON.parse(text); } catch { send(400, { error: "body is not JSON" }); return; }
        const sessionId = body?.sessionId;
        const kind = body?.kind;
        if (typeof sessionId !== "string" || (kind !== "first" && kind !== "compact")) {
          send(400, { error: "sessionId and kind (first|compact) required" });
          return;
        }
        const dedupKey = `${sessionId}:${kind}`;
        if (autoTitleInFlight.has(dedupKey)) {
          send(200, { skip: "in-flight" });
          return;
        }
        autoTitleInFlight.add(dedupKey);
        try {
          // 钉住保护：最后一条 title 事件是 user 写的且不是我们写的 → 用户手动改过，不碰
          const [current, titles] = await Promise.all([readSessionTitleFull(sessionId), readAutotitles()]);
          if (current?.kind === "user" && titles[sessionId]?.title !== current.title) {
            send(200, { skip: "user-pinned" });
            return;
          }
          // 分支家族不自动总结：标题由 edit-resend 统一成父会话名（客户端有同款守卫，这里是兜底）
          const branches = await readStore();
          if (branches.some((b) => b?.childId === sessionId || b?.parentId === sessionId)) {
            send(200, { skip: "branch-family" });
            return;
          }
          let material = "";
          if (kind === "first") {
            material = typeof body?.text === "string" ? body.text.trim() : "";
            // 确认真·首条（恰好 1 条用户消息且 10 分钟内）：挡掉打开旧会话的快照加载假象
            if (material && !(await waitFirstUserMessage(sessionId))) {
              send(200, { skip: "not-first" });
              return;
            }
          } else {
            material = (await waitCompactionSummary(sessionId)) ?? "";
          }
          if (!material) {
            send(200, { skip: "no-material" });
            return;
          }
          if (material.length > 12000) material = `${material.slice(0, 6000)}\n…\n${material.slice(-6000)}`;
          const title = await kimiTitle(material);
          if (!title) {
            send(200, { skip: "empty" });
            return;
          }
          await writeAutotitles({ ...titles, [sessionId]: { title, at: Date.now() } });
          send(200, { title });
        } catch (error) {
          const message = String(error?.message ?? error);
          // 令牌缺失/不新鲜 = 环境性跳过（等 harness 自己刷新后下次触发自愈），不算错误
          if (/token/i.test(message)) {
            send(200, { skip: message });
          } else {
            send(500, { error: message });
          }
        } finally {
          autoTitleInFlight.delete(dedupKey);
        }
      },
    }),
    "auto-title: route",
  );
}
