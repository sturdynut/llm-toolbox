// Transcript reading, the decision log, and per-session state shared by the hooks.
//
// Env:
//   JEV_ROUTER_LOG_DIR  default ~/.claude/jev-router. Holds decisions.jsonl (every
//                       routing decision and every miss) and sessions/<id>.json.
//                       Prompts are logged here in full: it is local, and harvest.mjs
//                       needs them to turn misses into calibration items.

import {
  openSync,
  readSync,
  fstatSync,
  closeSync,
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const logDir = () =>
  process.env.JEV_ROUTER_LOG_DIR || join(homedir(), ".claude", "jev-router");

export function appendLog(record) {
  mkdirSync(logDir(), { recursive: true });
  appendFileSync(join(logDir(), "decisions.jsonl"), JSON.stringify(record) + "\n");
}

// Session ids come from Claude Code, but they become a filename, so keep them tame.
const sessionFile = (id) =>
  join(logDir(), "sessions", `${String(id).replace(/[^\w.-]/g, "_")}.json`);

export function readSessionState(id) {
  try {
    return JSON.parse(readFileSync(sessionFile(id), "utf8"));
  } catch {
    return null;
  }
}

export function writeSessionState(id, state) {
  mkdirSync(join(logDir(), "sessions"), { recursive: true });
  writeFileSync(sessionFile(id), JSON.stringify(state));
}

// Harness noise that shows up as user text but isn't anything the user said.
const NOISE = /^\s*<(local-command-caveat|command-name|command-message|command-args|local-command-stdout|system-reminder)>/;

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");
}

// The last few user and assistant text turns, oldest first. A follow-up like "go for
// it" says nothing on its own; the turn before it is what Jev has to route on. Reads
// only the tail of the file: transcripts run to megabytes.
export function readRecent(transcriptPath, { turns = 3, maxChars = 1500, tailBytes = 512 * 1024 } = {}) {
  if (!transcriptPath || !existsSync(transcriptPath)) return [];
  let raw;
  const fd = openSync(transcriptPath, "r");
  try {
    const size = fstatSync(fd).size;
    const len = Math.min(size, tailBytes);
    const buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, size - len);
    raw = buf.toString("utf8");
    if (len < size) raw = raw.slice(raw.indexOf("\n") + 1); // drop the partial first line
  } finally {
    closeSync(fd);
  }

  const out = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (rec.type !== "user" && rec.type !== "assistant") continue;
    if (rec.isMeta || rec.isSidechain) continue;
    const text = textOf(rec.message?.content).trim();
    if (!text || NOISE.test(text)) continue;
    out.push({ role: rec.type, text: text.length > maxChars ? text.slice(0, maxChars) + " …" : text });
  }
  return out.slice(-turns);
}
