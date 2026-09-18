/**
 * dsh-client-ui-edit-resend — host half.
 *
 * 三条职责：
 * 1. 让 cordis 包契约成立（滑块同款）。
 * 2. /edit-resend-branches：分支记录（childId/parentId/parentMsgSeq/anchorSeq/createdAt）读写。
 * 3. /edit-resend-inbox：读取子会话日志中、最后一个 turn/end 之后经 next-turn splice
 *    排队的消息（供客户端在 open 之前移除，防止继承队列导致的原问题重放/重答）。
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

/** Stable Cordis plugin name. */
export const name = "dsh-client-ui-edit-resend";
/** Services required before the JSON route can be mounted. */
export const inject = ["webServer"];

const execFileAsync = promisify(execFile);
const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const HOME = resolve(pluginRoot, "..", "..");
const SESSIONS_ROOT = join(HOME, "sessions");
const STORE = join(pluginRoot, "branches.json");

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

async function findSessionLog(sessionId) {
  for (const ws of await readdir(SESSIONS_ROOT)) {
    const candidate = join(SESSIONS_ROOT, ws, sessionId, "session.v3.jsonl.zstd");
    try {
      await readFile(candidate);
      return candidate;
    } catch {}
  }
  return null;
}

/** 读取会话日志里、最后一个 turn/end 之后经 next-turn splice 排队的消息。 */
async function listInboxQueued(sessionId) {
  const log = await findSessionLog(sessionId);
  if (!log) return [];
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
          send(200, { branches: await readStore() });
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
          send(200, { items });
        } catch (error) {
          send(500, { error: String(error?.message ?? error) });
        }
      },
    }),
    "edit-resend: inbox route",
  );
}
