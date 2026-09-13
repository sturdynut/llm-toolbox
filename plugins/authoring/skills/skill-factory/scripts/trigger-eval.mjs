#!/usr/bin/env node
// Grade a skill's trigger-evals in ONE model call.
//
// Usage: node trigger-eval.mjs <skill-dir> [--model <id>] [--verbose]
//
// Reads <skill-dir>/SKILL.md for the name and description, and
// <skill-dir>/evals/trigger-evals.json for the cases, then asks a small model
// to decide YES/NO for every case in a single request. Batching matters: one
// call per case turns a 20-case suite into 20 subprocess spawns and ~20x the
// cost, for an answer that fits in one response.
//
// The call goes out with --strict-mcp-config and an empty --setting-sources so
// the grader doesn't inherit this machine's MCP schemas, hooks, or CLAUDE.md
// chain. Measured on this repo: 26.5k input tokens without those flags, 21.4k
// with, and a 63% lower bill because the cache composition changes too.
//
// Only the description is shown to the grader, because only the description
// decides triggering. A failing case is a description bug, never a body bug.

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const dir = resolve(argv.find((a) => !a.startsWith("--")) || ".");
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const MODEL = flag("--model", process.env.SKILL_EVAL_MODEL || "claude-haiku-4-5-20251001");
const VERBOSE = argv.includes("--verbose");

function die(msg) {
  console.error(`trigger-eval: ${msg}`);
  process.exit(2);
}

const skillPath = join(dir, "SKILL.md");
const evalPath = join(dir, "evals", "trigger-evals.json");
if (!existsSync(skillPath)) die(`no SKILL.md in ${dir}`);
if (!existsSync(evalPath)) die(`no evals/trigger-evals.json in ${dir}`);

// Frontmatter: a YAML block-scalar description folds onto continuation lines, so
// take everything up to the next top-level key rather than the first line only.
const src = readFileSync(skillPath, "utf8");
const fm = /^---\n([\s\S]*?)\n---/.exec(src);
if (!fm) die("SKILL.md has no YAML frontmatter");
const field = (key) => {
  const m = new RegExp(`^${key}:[ \\t]*(.*(?:\\n[ \\t]+.*)*)`, "m").exec(fm[1]);
  if (!m) return "";
  return m[1].replace(/^[>|][-+]?\s*/, "").replace(/\s+/g, " ").trim();
};
const name = field("name");
const description = field("description");
if (!name || !description) die("frontmatter needs both name and description");

let cases;
try {
  cases = JSON.parse(readFileSync(evalPath, "utf8"));
} catch (e) {
  die(`evals/trigger-evals.json is not valid JSON: ${e.message}`);
}
if (!Array.isArray(cases) || !cases.length) die("trigger-evals.json must be a non-empty array");
for (const [i, c] of cases.entries()) {
  if (typeof c?.query !== "string" || typeof c?.should_trigger !== "boolean") {
    die(`case ${i} needs a string "query" and a boolean "should_trigger"`);
  }
}

const prompt =
  `A Claude Code agent has this skill available:\n\n` +
  `name: ${name}\ndescription: ${description}\n\n` +
  `For each numbered user message below, decide whether the agent should invoke ` +
  `this skill. Judge only against the description above.\n\n` +
  cases.map((c, i) => `${i + 1}. ${c.query}`).join("\n") +
  `\n\nReply with exactly one line per number, formatted "N: YES" or "N: NO". ` +
  `No other text.`;

let out;
try {
  out = execFileSync(
    "claude",
    ["-p", prompt, "--model", MODEL, "--strict-mcp-config", "--setting-sources", ""],
    { encoding: "utf8", timeout: 120000, maxBuffer: 1 << 22, stdio: ["ignore", "pipe", "pipe"] },
  );
} catch (e) {
  if (e.code === "ENOENT") die("the `claude` CLI is not on PATH");
  die(`grader call failed: ${e.stderr?.toString().trim() || e.message}`);
}

if (VERBOSE) console.error(`--- grader output ---\n${out}\n---`);

const verdicts = new Map();
for (const line of out.split("\n")) {
  const m = /^\s*(\d+)\s*[:.)-]\s*(YES|NO)\b/i.exec(line);
  if (m) verdicts.set(Number(m[1]), m[2].toUpperCase() === "YES");
}

let pass = 0;
const failures = [];
const unanswered = [];
cases.forEach((c, i) => {
  const got = verdicts.get(i + 1);
  if (got === undefined) {
    unanswered.push(c);
    return;
  }
  if (got === c.should_trigger) pass++;
  else failures.push({ ...c, got });
});

const mark = (b) => (b ? "trigger" : "skip");
console.log(`\n${name} — ${pass}/${cases.length} cases passed (model: ${MODEL})\n`);
for (const f of failures) {
  console.log(`  FAIL  expected ${mark(f.should_trigger)}, got ${mark(f.got)}`);
  console.log(`        "${f.query}"`);
}
for (const u of unanswered) {
  console.log(`  ????  grader returned no verdict`);
  console.log(`        "${u.query}"`);
}

if (failures.length || unanswered.length) {
  const overTrigger = failures.filter((f) => f.got && !f.should_trigger).length;
  const underTrigger = failures.filter((f) => !f.got && f.should_trigger).length;
  console.log(
    `\n  ${underTrigger} under-trigger, ${overTrigger} over-trigger. ` +
      `Fix the description, not the body — the body has no effect on triggering.`,
  );
  console.log(
    `  Under-triggering usually means the user's phrasing isn't in the description; ` +
      `over-triggering means a boundary is missing.\n`,
  );
  process.exit(1);
}
console.log(`  Graded against the description alone, with no competing skills loaded.\n`);
