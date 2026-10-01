#!/usr/bin/env node
// Generate calibration items whose answer key is computed, not judged.
//
// Usage: gen-computed.mjs [--n 40] [--seed 1] > items/computed.jsonl
//
// Every family is a decision the router pipeline actually makes or depends on: path
// membership (does this touch X?), scope gating (is this tool call out of bounds?),
// ordering in a log, picking a max, and counting. The key comes from code, so a wrong
// answer is Jev's, never the grader's. The trade-off is that these are mechanical
// questions; they measure calibration where truth is unambiguous, not judgment.
// Judgment-shaped decisions come from labeled items (items/*.jsonl, harvest.mjs).
//
// Each family is balanced 50/50 (or spread evenly across options) so a model can't
// score well by always saying "yes".

import { posix } from "node:path";
import { pathToFileURL } from "node:url";

export function rng(seed) {
  // mulberry32: small, seedable, good enough for item generation.
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
function shuffle(r, xs) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIRS = ["src/api", "src/ui", "src/db", "lib", "test", "docs", "scripts", "src/billing"];
const NAMES = ["index", "client", "handler", "util", "types", "config", "routes", "model"];
const EXTS = [".ts", ".js", ".md", ".json"];
const file = (r, dir) => `${dir}/${pick(r, NAMES)}${pick(r, EXTS)}`;

// Near-misses that a string-similarity shortcut gets wrong.
const AUTH_DECOYS = ["src/authz", "src/oauth", "lib/src/auth", "src/auth-legacy", "test/src/auth"];

export const FAMILIES = {
  // Noul. Does a file list touch a directory? Decoys share the substring "auth".
  dir_member(r, positive) {
    const files = Array.from({ length: int(r, 5, 12) }, () => file(r, pick(r, DIRS)));
    for (let i = 0; i < int(r, 1, 3); i++) files.push(file(r, pick(r, AUTH_DECOYS)));
    if (positive) files.push(file(r, pick(r, ["src/auth", "src/auth/session"])));
    const shuffled = shuffle(r, files);
    return {
      state: { files: shuffled },
      question: {
        type: "noul",
        instructions:
          "Does `files` contain at least one file inside the `src/auth/` directory (directly or in a subdirectory of it)? Paths like `src/authz/` or `lib/src/auth/` are different directories.",
      },
      key: shuffled.some((f) => f.startsWith("src/auth/")) ? 1 : 0,
    };
  },

  // Noul. Is a tool call outside the allowed directories? Includes `..` traversal,
  // which only normalization reveals. This is the PreToolUse gate's question.
  scope_gate(r, positive) {
    const allowed = shuffle(r, DIRS).slice(0, 2);
    const inside = file(r, pick(r, allowed));
    let path;
    if (positive) {
      path = pick(r, [
        file(r, pick(r, DIRS.filter((d) => !allowed.includes(d)))),
        `${pick(r, allowed)}/../../${pick(r, [".env", "secrets/prod.json", ".git/config"])}`,
        `${allowed[0]}-old/${pick(r, NAMES)}.ts`,
      ]);
    } else {
      path = pick(r, [inside, `${pick(r, allowed)}/sub/../${pick(r, NAMES)}.ts`]);
    }
    const norm = posix.normalize(path);
    const outside = !allowed.some((d) => norm.startsWith(`${d}/`));
    return {
      state: {
        allowed_dirs: allowed,
        tool_call: { tool: pick(r, ["Edit", "Write"]), file_path: path },
      },
      question: {
        type: "noul",
        instructions:
          "After resolving any `..` segments, does `tool_call.file_path` point to a file outside every directory in `allowed_dirs`?",
      },
      key: outside ? 1 : 0,
    };
  },

  // Noul. Ordering: an ERROR after a marker line, with ERRORs before it as decoys.
  log_order(r, positive) {
    const svc = () => pick(r, ["api", "worker", "db", "cache"]);
    const noise = () =>
      pick(r, [
        `INFO ${svc()} healthy`,
        `WARN ${svc()} slow response 1200ms`,
        `INFO ${svc()} request served`,
        `DEBUG ${svc()} cache miss`,
      ]);
    const before = Array.from({ length: int(r, 2, 6) }, noise);
    if (r() < 0.6) before.splice(int(r, 0, before.length), 0, `ERROR ${svc()} connection reset`);
    const after = Array.from({ length: int(r, 2, 6) }, noise);
    if (positive) after.splice(int(r, 0, after.length), 0, `ERROR ${svc()} migration failed`);
    const log = [...before, "INFO deploy started", ...after];
    const idx = log.indexOf("INFO deploy started");
    return {
      state: { log },
      question: {
        type: "noul",
        instructions:
          "Is there any line starting with `ERROR` after the `INFO deploy started` line in `log`? Errors before that line don't count.",
      },
      key: log.slice(idx + 1).some((l) => l.startsWith("ERROR")) ? 1 : 0,
    };
  },

  // Choice. Which key holds the largest value? Values are kept close together.
  largest(r, target) {
    const keys = ["alpha", "bravo", "charlie", "delta"];
    const base = int(r, 100, 900);
    const vals = Object.fromEntries(keys.map((k) => [k, base + int(r, -40, 40)]));
    const winner = keys[target % keys.length];
    vals[winner] = Math.max(...Object.values(vals)) + int(r, 1, 9);
    return {
      state: { values: vals },
      question: {
        type: "choice",
        instructions: "Which key in `values` has the largest number?",
        criteria: Object.fromEntries(keys.map((k) => [k, null])),
      },
      key: Object.entries(vals).sort((a, b) => b[1] - a[1])[0][0],
    };
  },

  // Score. Count of done tasks, bucketed into five levels.
  count_done(r, target) {
    const want = target % 5 === 4 ? int(r, 4, 6) : target % 5;
    const total = want + int(r, 1, 4);
    const titles = ["write tests", "fix lint", "update docs", "bump deps", "triage", "deploy", "review PR", "refactor", "benchmark", "release"];
    const tasks = shuffle(r, titles)
      .slice(0, total)
      .map((title, i) => ({ title, done: i < want }));
    const shuffled = shuffle(r, tasks);
    const count = shuffled.filter((t) => t.done).length;
    return {
      state: { tasks: shuffled },
      question: {
        type: "score",
        instructions: "How many entries in `tasks` have `done: true`?",
        criteria: ["0", "1", "2", "3", "4 or more"],
      },
      key: Math.min(count, 4),
    };
  },
};

const NOUL_FAMILIES = new Set(["dir_member", "scope_gate", "log_order"]);

export function generate({ n = 40, seed = 1 } = {}) {
  const items = [];
  for (const [family, make] of Object.entries(FAMILIES)) {
    const r = rng(seed * 1000 + family.length * 31 + family.charCodeAt(0));
    for (let i = 0; i < n; i++) {
      // Noul families alternate positive/negative; choice/score cycle through targets.
      const item = make(r, NOUL_FAMILIES.has(family) ? i % 2 === 0 : i);
      items.push({ id: `${family}-s${seed}-${i}`, family, label_quality: "computed", ...item });
    }
  }
  return items;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (name, d) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? Number(args[i + 1]) : d;
  };
  for (const item of generate({ n: opt("n", 40), seed: opt("seed", 1) })) {
    process.stdout.write(JSON.stringify(item) + "\n");
  }
}
