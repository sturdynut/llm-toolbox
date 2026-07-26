#!/usr/bin/env node
// SessionStart hook: measure what every session pays for before you type a word,
// and attribute it to a file.
//
// Context-guard's job is the *conversation* getting fat. This one's job is the
// *baseline* being fat — a CLAUDE.md that grew to 900 lines, an @-imported
// reference doc nobody remembers importing, a skills directory whose
// descriptions alone cost thousands of tokens. That cost is paid on every single
// session, forever, and it is invisible because it arrives before the first
// prompt.
//
// Deterministic and free: it reads files off disk and estimates tokens at ~4
// chars/token. It does not call a model. It warns only when the total crosses a
// threshold or a single file is disproportionate, and it fingerprints what it
// measured so it stays quiet until something actually changes.
//
// What it measures:
//   - the CLAUDE.md chain: ~/.claude/CLAUDE.md, plus every CLAUDE.md and
//     CLAUDE.local.md from cwd up to $HOME
//   - @-imports inside those files, followed recursively (this is the usual
//     hiding place for bloat)
//   - skill and agent descriptions in ~/.claude and <project>/.claude, which are
//     loaded into the system prompt whether or not the skill is ever used
//
// What it does NOT measure: MCP tool schemas and installed-plugin skills. Both
// are real, often dominant, costs — but their size isn't knowable from disk
// without resolving which are enabled and connecting to servers. `/context`
// shows the true totals; this hook tells you which *file you control* is the
// problem.
//
// Tunables via env:
//   SESSION_WEIGHT_OFF     "1" disables the hook
//   SESSION_WEIGHT_WARN    warn above this many est. tokens  (default 10000)
//   SESSION_WEIGHT_FILE    flag any single file above this   (default 4000)
//   SESSION_WEIGHT_QUIET_H hours to stay quiet after warning (default 24)

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { homedir } from "node:os";

// Must match GUARD_DIR in context-guard.mjs and statusline.py — the harness
// plugin keeps all session state in one place. Hardcoded to /tmp (not
// os.tmpdir()) because on macOS os.tmpdir() is $TMPDIR, not /tmp.
const GUARD_DIR = "/tmp/claude-context-guard";

const OFF = process.env.SESSION_WEIGHT_OFF === "1";
const WARN = Number(process.env.SESSION_WEIGHT_WARN) || 10000;
const FILE_WARN = Number(process.env.SESSION_WEIGHT_FILE) || 4000;
const QUIET_H = Number(process.env.SESSION_WEIGHT_QUIET_H) || 24;

const HOME = homedir();
const MAX_IMPORT_DEPTH = 5;

const ok = () => process.exit(0); // silent no-op

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return null;
  }
}

// ~4 chars per token. Rough, but consistently rough — good enough to rank
// sources against each other and to catch an order-of-magnitude problem.
const estTokens = (text) => Math.round(text.length / 4);

const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function readIfFile(path) {
  try {
    if (!statSync(path).isFile()) return null;
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

// Display paths relative to $HOME so the message stays narrow.
const short = (path) => (path.startsWith(HOME) ? `~${path.slice(HOME.length)}` : path);

// --- CLAUDE.md discovery -----------------------------------------------------

// Every CLAUDE.md / CLAUDE.local.md from cwd up to $HOME, nearest last, plus the
// user-level one. Mirrors how Claude Code assembles the chain.
function memoryChain(cwd) {
  const files = [];
  const seen = new Set();

  const add = (path) => {
    const abs = resolve(path);
    if (!seen.has(abs) && readIfFile(abs) !== null) {
      seen.add(abs);
      files.push(abs);
    }
  };

  add(join(HOME, ".claude", "CLAUDE.md"));

  const dirs = [];
  let dir = resolve(cwd);
  for (let i = 0; i < 30; i++) {
    dirs.push(dir);
    if (dir === HOME || dir === dirname(dir)) break;
    dir = dirname(dir);
  }
  for (const d of dirs.reverse()) {
    add(join(d, "CLAUDE.md"));
    add(join(d, "CLAUDE.local.md"));
  }
  return files;
}

// CLAUDE.md supports `@path` imports. They are the most common source of
// surprise weight, because the cost lives in a file you didn't open.
function parseImports(text, baseDir) {
  const out = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("```") || line.startsWith("#")) continue;
    const m = line.match(/(?:^|\s)@([~./][^\s`)"']*|[A-Za-z0-9_][^\s`)"']*\.md)/);
    if (!m) continue;
    let p = m[1];
    if (p.startsWith("~")) p = join(HOME, p.slice(1));
    out.push(resolve(baseDir, p));
  }
  return out;
}

function collectMemory(cwd) {
  const entries = [];
  const visited = new Set();

  const walk = (path, depth, viaImport) => {
    const abs = resolve(path);
    if (visited.has(abs) || depth > MAX_IMPORT_DEPTH) return;
    visited.add(abs);
    const text = readIfFile(abs);
    if (text === null) return;
    entries.push({ path: abs, tokens: estTokens(text), viaImport });
    for (const imp of parseImports(text, dirname(abs))) walk(imp, depth + 1, true);
  };

  for (const f of memoryChain(cwd)) walk(f, 0, false);
  return entries;
}

// --- Skill / agent description overhead --------------------------------------

// Only the YAML frontmatter of a skill or agent is loaded up front; the body is
// read on invocation. So a long SKILL.md is cheap and a long *description* is
// not — which is the opposite of most people's intuition.
function frontmatter(text) {
  if (!text.startsWith("---")) return "";
  const end = text.indexOf("\n---", 3);
  return end === -1 ? "" : text.slice(0, end + 4);
}

function collectDefs(root, kind) {
  const dir = join(root, ".claude", kind === "skill" ? "skills" : "agents");
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return null;
  }
  let tokens = 0;
  let count = 0;
  for (const name of names) {
    const path = kind === "skill" ? join(dir, name, "SKILL.md") : join(dir, name);
    if (kind === "agent" && !name.endsWith(".md")) continue;
    const text = readIfFile(path);
    if (text === null) continue;
    tokens += estTokens(frontmatter(text));
    count++;
  }
  return count ? { dir, tokens, count, kind } : null;
}

// --- Throttle ----------------------------------------------------------------

// Fingerprint what we measured, so an ignored warning stays ignored until the
// underlying files actually change. Cheap FNV-1a over paths and sizes.
function fingerprint(parts) {
  let h = 0x811c9dc5;
  for (const s of parts.join("|")) {
    h ^= s.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function shouldWarn(fp, now) {
  const file = join(GUARD_DIR, "session-weight.json");
  let state = {};
  try {
    state = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    /* first run */
  }
  const quietMs = QUIET_H * 3600 * 1000;
  if (state.fp === fp && now - (state.warnedAt || 0) < quietMs) return null;
  return () => {
    try {
      if (!existsSync(GUARD_DIR)) mkdirSync(GUARD_DIR, { recursive: true });
      writeFileSync(file, JSON.stringify({ fp, warnedAt: now }));
    } catch {
      /* best effort — a warning is not worth failing a session over */
    }
  };
}

// --- Main --------------------------------------------------------------------

function main() {
  if (OFF) return ok();
  const input = readStdin();

  // Only on a genuinely fresh baseline. `resume` and `compact` re-enter an
  // existing conversation; nagging there is noise.
  const source = input?.source;
  if (source && source !== "startup" && source !== "clear") return ok();

  const cwd = input?.cwd || process.cwd();

  const memory = collectMemory(cwd);
  const defs = [
    collectDefs(HOME, "skill"),
    collectDefs(HOME, "agent"),
    collectDefs(cwd, "skill"),
    collectDefs(cwd, "agent"),
  ].filter(Boolean);

  const memTokens = memory.reduce((a, e) => a + e.tokens, 0);
  const defTokens = defs.reduce((a, d) => a + d.tokens, 0);
  const total = memTokens + defTokens;

  const heavy = memory.filter((e) => e.tokens >= FILE_WARN);
  if (total < WARN && heavy.length === 0) return ok();

  const commit = shouldWarn(
    fingerprint([...memory.map((e) => `${e.path}:${e.tokens}`), ...defs.map((d) => `${d.dir}:${d.tokens}`)]),
    Date.now(),
  );
  if (!commit) return ok();

  // Rank by cost — the whole value here is naming the file to go edit.
  const ranked = [...memory].sort((a, b) => b.tokens - a.tokens).slice(0, 5);
  const lines = ranked
    .filter((e) => e.tokens > 0)
    .map((e) => `   ${fmt(e.tokens).padStart(6)}  ${short(e.path)}${e.viaImport ? "  (@import)" : ""}`);

  for (const d of defs.sort((a, b) => b.tokens - a.tokens)) {
    lines.push(`   ${fmt(d.tokens).padStart(6)}  ${d.count} ${d.kind} description${d.count === 1 ? "" : "s"} in ${short(d.dir)}`);
  }

  const msg =
    `ℹ️  Every session in this directory starts ~${fmt(total)} tokens deep before you ` +
    `type anything, from config you control:\n\n${lines.join("\n")}\n\n` +
    `   Estimates (~4 chars/token). MCP tool schemas and installed-plugin skills are ` +
    `extra and not counted here — run /context for the true total.\n` +
    `   Trimming the top entry pays off on every session, not just this one.`;

  commit();
  process.stdout.write(JSON.stringify({ systemMessage: msg, suppressOutput: true }));
  process.exit(0);
}

main();
