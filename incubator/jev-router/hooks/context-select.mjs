#!/usr/bin/env node
// UserPromptSubmit hook: ask Jev which context packs this prompt needs, inject those,
// and list the rest so Claude can still read them.
//
// The failure that matters is a pack left out that was needed: Claude then reasons
// fluently over an incomplete picture and nothing flags it. So:
//   - the threshold is recall-first (include on a weak yes),
//   - every skipped pack is named with its path, so Claude can Read it,
//   - note-miss.mjs logs each time Claude does read a skipped pack, and harvest.mjs
//     turns those misses into labeled calibration items,
//   - if Jev is unreachable, every pack is included (up to the budget), which is just
//     the behaviour you had before the router.
//
// Packs live in <project>/.claude/context-packs/*.md; see lib/packs.mjs for the format.
// No packs, no output: the hook is inert in projects that don't use it.
//
// Sends the prompt and the last few conversation turns to TypeSafe's API.
//
// Env:
//   JEV_ROUTER_OFF        "1" disables the hook
//   JEV_ROUTER_PACKS      packs directory (default <cwd>/.claude/context-packs)
//   JEV_ROUTER_THRESHOLD  include when p(yes) >= this (default 0.2)
//   JEV_ROUTER_MAX_CHARS  injected-text budget across packs (default 24000)
//   JEV_ROUTER_TIMEOUT    ms for the Jev call, retries included (default 4000)
//   plus TYPESAFE_API_KEY, JEV_MODEL, JEV_ROUTER_LOG_DIR (see lib/)

import { readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { systemOne } from "../lib/jev.mjs";
import { loadPacks, packQuestion } from "../lib/packs.mjs";
import { readRecent, appendLog, writeSessionState } from "../lib/session.mjs";

function envNum(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function decide(input, { client = systemOne } = {}) {
  const cwd = input.cwd || process.cwd();
  const packs = loadPacks(process.env.JEV_ROUTER_PACKS || join(cwd, ".claude", "context-packs"));
  if (packs.length === 0) return null;

  const threshold = envNum("JEV_ROUTER_THRESHOLD", 0.2);
  const budget = envNum("JEV_ROUTER_MAX_CHARS", 24000);
  const timeoutMs = envNum("JEV_ROUTER_TIMEOUT", 4000);

  const prompt = input.prompt || "";
  const recent = readRecent(input.transcript_path).filter(
    (t) => !(t.role === "user" && t.text.trim() === prompt.trim()),
  );
  const state = { project: basename(cwd), prompt, recent_conversation: recent };

  const asked = packs.filter((p) => !p.always);
  const questions = Object.fromEntries(asked.map((p, i) => [`p${i}`, packQuestion(p)]));

  let answers = null;
  let model = null;
  let error = null;
  if (asked.length) {
    try {
      const res = await client({ state, questions }, { timeoutMs });
      answers = res.answers;
      model = res.model;
    } catch (err) {
      error = err.message;
    }
  }

  // Score each pack. With no answers (Jev down), everything gets p=null and is
  // included, ordered as on disk, until the budget runs out.
  const scored = packs.map((p) => {
    if (p.always) return { pack: p, p: null, want: true, reason: "always" };
    const ans = answers?.[`p${asked.indexOf(p)}`];
    if (!answers || typeof ans?.noul !== "number")
      return { pack: p, p: null, want: true, reason: "fail-open" };
    return { pack: p, p: ans.noul, want: ans.noul >= threshold, reason: ans.noul >= threshold ? "selected" : "below-threshold" };
  });

  // Fill the budget: always-packs first, then by p descending.
  const order = [...scored].sort(
    (a, b) => (b.reason === "always") - (a.reason === "always") || (b.p ?? 0) - (a.p ?? 0),
  );
  let used = 0;
  for (const s of order) {
    if (!s.want) continue;
    if (used + s.pack.body.length > budget) {
      s.want = false;
      s.reason = "over-budget";
      continue;
    }
    used += s.pack.body.length;
  }

  const included = order.filter((s) => s.want);
  const skipped = scored.filter((s) => !s.want);
  const decisionId = randomUUID();

  const record = {
    kind: "decision",
    id: decisionId,
    ts: new Date().toISOString(),
    session_id: input.session_id,
    model,
    threshold,
    error,
    state,
    packs: scored.map((s) => ({
      name: s.pack.name,
      path: s.pack.path,
      p: s.p,
      included: s.want,
      reason: s.reason,
      question: s.pack.always ? undefined : packQuestion(s.pack),
    })),
  };

  return { record, included, skipped, context: render(included, skipped, error) };
}

function render(included, skipped, error) {
  const L = ["<context-packs>"];
  if (error) L.push(`(Pack selection was unavailable: ${error}. Loaded every pack that fit.)`, "");
  for (const s of included) L.push(`## ${s.pack.name}`, "", s.pack.body, "");
  if (skipped.length) {
    L.push("Not loaded. If the task turns out to need one of these, Read the file:");
    for (const s of skipped) L.push(`- ${s.pack.name}: ${s.pack.description} (${s.pack.path})`);
  }
  L.push("</context-packs>");
  return L.join("\n");
}

async function main() {
  if (process.env.JEV_ROUTER_OFF === "1") return;
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return;
  }
  const out = await decide(input);
  if (!out) return;
  try {
    appendLog(out.record);
    if (input.session_id) {
      writeSessionState(input.session_id, {
        decision_id: out.record.id,
        skipped: out.skipped.map((s) => ({ name: s.pack.name, path: s.pack.path, p: s.p })),
      });
    }
  } catch {
    // Logging is for calibration later; never let it cost the user their context.
  }
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: out.context },
    }),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => process.exit(0));
}
