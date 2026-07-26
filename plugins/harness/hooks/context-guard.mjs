#!/usr/bin/env node
// UserPromptSubmit hook: warn when the conversation is getting large, looks
// stuck, or has drifted to a new topic ("veering off course"), suggesting
// /compact or a fresh conversation.
//
// Two layers:
//   1. Deterministic + free (always on): estimates context fill from the last
//      assistant message's usage, and scans the tail for a loop signal (same
//      file edited repeatedly / repeated tool errors).
//   2. Semantic drift (optional, one small model call): only in the band
//      [SEM_FLOOR, WARN), throttled, compares the FIRST prompt (original goal)
//      to the CURRENT prompt to detect a topic switch. Pluggable provider —
//      defaults to `claude -p`, which rides existing subscription auth.
//      This is the only part of the hook that sends prompt text anywhere;
//      CONTEXT_GUARD_PROVIDER=ollama keeps it on-machine.
//
// All warnings are throttled via a per-session state file so it never nags.
//
// Tunables via env:
//   CONTEXT_GUARD_WINDOW    context window in tokens     (default 200000)
//   CONTEXT_GUARD_WARN      soft threshold, fraction     (default 0.65)
//   CONTEXT_GUARD_HARD      hard threshold, fraction     (default 0.80)
//   CONTEXT_GUARD_SEMANTIC  "0" disables the drift layer (default on)
//   CONTEXT_GUARD_SEM_FLOOR floor for drift checks       (default 0.40)
//   CONTEXT_GUARD_SEM_EVERY run drift check every Nth    (default 4)
//                           qualifying prompt
//   CONTEXT_GUARD_PROVIDER  claude|ollama|codex|cursor  (default claude)
//   CONTEXT_GUARD_MODEL     model for the drift check    (per-provider default)
//   CONTEXT_GUARD_CMD       custom command; prompt on    (overrides PROVIDER)
//                           stdin, prints a 0-100 score
//   CONTEXT_GUARD_TIMEOUT   ms for the drift call        (default 8000)
//   CONTEXT_GUARD_OFF       "1" disables the whole hook

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

// Must match GUARD_DIR in statusline.py so the two share state. Hardcoded to
// /tmp (not os.tmpdir()) because on macOS os.tmpdir() is $TMPDIR, not /tmp.
const GUARD_DIR = "/tmp/claude-context-guard";

const OFF = process.env.CONTEXT_GUARD_OFF === "1";
const WINDOW = Number(process.env.CONTEXT_GUARD_WINDOW) || 200000;
const WARN = Number(process.env.CONTEXT_GUARD_WARN) || 0.65;
const HARD = Number(process.env.CONTEXT_GUARD_HARD) || 0.8;
const SEMANTIC = process.env.CONTEXT_GUARD_SEMANTIC !== "0";
const SEM_FLOOR = Number(process.env.CONTEXT_GUARD_SEM_FLOOR) || 0.4;
const SEM_EVERY = Number(process.env.CONTEXT_GUARD_SEM_EVERY) || 4;
const DRIFT_WARN = Number(process.env.CONTEXT_GUARD_DRIFT_WARN) || 60;

// --- Drift-check provider ----------------------------------------------------
// The drift check is the only part of this hook that sends prompt text anywhere.
// Which engine grades it is pluggable, so it can be kept on-machine (ollama) or
// disabled outright (CONTEXT_GUARD_SEMANTIC=0).
//
// Built-in adapters cover the four verified here. Anything else goes through
// CONTEXT_GUARD_CMD: an arbitrary shell command that receives the grading prompt
// on STDIN and prints a number. The prompt is never interpolated into the
// command string, so there is nothing to shell-escape.
const PROVIDER = (process.env.CONTEXT_GUARD_PROVIDER || "claude").toLowerCase();
const CUSTOM_CMD = process.env.CONTEXT_GUARD_CMD || "";
// Bounded below the hook's own timeout in hooks.json, or the hook is killed
// mid-call and the subprocess timeout never fires.
const CALL_TIMEOUT = Number(process.env.CONTEXT_GUARD_TIMEOUT) || 8000;

const PROVIDERS = {
  // Rides existing subscription auth — no API key needed.
  claude: {
    model: "claude-haiku-4-5-20251001",
    argv: (model, prompt) => ["claude", ["-p", prompt, "--model", model]],
  },
  // Fully local: prompt text never leaves the machine. Use a small
  // instruction-following model — reasoning models blow the time budget.
  ollama: {
    model: "llama3.2",
    argv: (model, prompt) => ["ollama", ["run", model, prompt]],
  },
  // Codex is an *agent*, not a completion endpoint, so it needs fencing:
  // --ephemeral (no session files), -s read-only, and --cd into an empty scratch
  // dir so the grader has no source tree to wander into. Its stdout carries a
  // banner and a token count, so the score is read from --output-last-message
  // instead of being fished out of the chrome.
  codex: {
    model: "", // whatever the user's codex config selects
    needsCwd: true,
    readsFile: true,
    argv: (model, prompt, outFile, cwd) => [
      "codex",
      [
        "exec",
        "--ephemeral",
        "--skip-git-repo-check",
        "--color", "never",
        "-s", "read-only",
        "-c", "model_reasoning_effort=low", // "minimal" is rejected by gpt-5.5
        "--cd", cwd,
        "-o", outFile,
        ...(model ? ["-m", model] : []),
        prompt,
      ],
    ],
  },
  // Also an agent. `-p` alone would hand it write and shell access, so it runs
  // in `--mode ask` (read-only Q&A) pointed at an empty workspace. --trust
  // suppresses the workspace-trust prompt that would otherwise hang a hook.
  // Its stdout is already a bare number, so no output file is needed.
  cursor: {
    model: "", // whatever the account default is
    needsCwd: true,
    argv: (model, prompt, _outFile, cwd) => [
      "cursor-agent",
      [
        "-p",
        "--mode", "ask",
        "--output-format", "text",
        "--workspace", cwd,
        "--trust",
        ...(model ? ["--model", model] : []),
        prompt,
      ],
    ],
  },
};

const MODEL =
  process.env.CONTEXT_GUARD_MODEL || PROVIDERS[PROVIDER]?.model || "";

const ok = () => process.exit(0); // silent no-op

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return null;
  }
}

function contextTokens(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line || line.indexOf('"usage"') === -1) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    const u = e?.message?.usage;
    if (!u) continue;
    return (
      (u.input_tokens || 0) +
      (u.cache_read_input_tokens || 0) +
      (u.cache_creation_input_tokens || 0)
    );
  }
  return 0;
}

// Cheap "off course" proxy: are we thrashing? Look at recent tool uses for the
// same file edited over and over, or a run of tool errors.
function loopSignal(lines) {
  const editCounts = new Map();
  let errorRun = 0;
  let maxErrorRun = 0;
  let scanned = 0;
  for (let i = lines.length - 1; i >= 0 && scanned < 40; i--) {
    let e;
    try {
      e = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    const content = e?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type === "tool_use") {
        scanned++;
        const fp = block.input?.file_path;
        if ((block.name === "Edit" || block.name === "Write") && fp) {
          editCounts.set(fp, (editCounts.get(fp) || 0) + 1);
        }
      } else if (block?.type === "tool_result") {
        if (block.is_error) maxErrorRun = Math.max(maxErrorRun, ++errorRun);
        else errorRun = 0;
      }
    }
  }
  const maxEdits = Math.max(0, ...editCounts.values());
  if (maxEdits >= 5) return "the same file has been edited many times in a row";
  if (maxErrorRun >= 4) return "several tool calls in a row have failed";
  return null;
}

// Pull the first genuine user prompt (the original goal) as plain text.
function firstUserText(lines) {
  for (const line of lines) {
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    if (e?.type !== "user") continue;
    const c = e?.message?.content;
    if (typeof c === "string") {
      if (c.trim()) return c;
    } else if (Array.isArray(c)) {
      const text = c
        .filter((b) => b?.type === "text" && b.text)
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (text) return text; // skips tool_result-only user entries
    }
  }
  return null;
}

const clip = (s, n) => (s.length > n ? s.slice(0, n) + " …" : s);

// Ask Haiku to grade how far the new prompt has moved from the original task:
// 0 = same task / direct follow-up .. 100 = a completely unrelated new task.
// Returns an integer 0..100, or null on any failure.
function driftScore(original, current) {
  const prompt =
    "You grade topic drift for a coding assistant. On a scale of 0 to 100, how " +
    "much has the USER'S NEW MESSAGE moved to a different task or topic from the " +
    "ORIGINAL TASK? 0 = same task or a direct follow-up / refinement / related " +
    "debugging; 100 = a completely unrelated new task. Judge only the topic, not " +
    "length or tone.\n\nORIGINAL TASK:\n" +
    clip(original, 600) +
    "\n\nNEW MESSAGE:\n" +
    clip(current, 600) +
    "\n\nReply with ONLY the integer.";
  const spec = CUSTOM_CMD ? null : PROVIDERS[PROVIDER];
  if (!CUSTOM_CMD && !spec) return null; // unknown provider, no custom command

  // Agent-shaped providers get confined to an empty scratch dir so they have no
  // source tree to wander into; some also report their answer via a file.
  let outFile = null;
  let scratchCwd = null;
  if (spec?.needsCwd || spec?.readsFile) {
    try {
      scratchCwd = join(GUARD_DIR, "agent-cwd");
      mkdirSync(scratchCwd, { recursive: true });
      if (spec.readsFile) outFile = join(GUARD_DIR, `drift-${process.pid}.txt`);
    } catch {
      return null;
    }
  }

  try {
    // Custom command: prompt goes in on stdin, never into the command string.
    const [file, args, input] = CUSTOM_CMD
      ? ["sh", ["-c", CUSTOM_CMD], prompt]
      : [...spec.argv(MODEL, prompt, outFile, scratchCwd), ""];
    const out = execFileSync(file, args, {
      input,
      encoding: "utf8",
      timeout: CALL_TIMEOUT,
      maxBuffer: 1 << 20,
      stdio: ["pipe", "pipe", "ignore"], // a chatty stderr is not our problem
      env: { ...process.env, CONTEXT_GUARD_OFF: "1" }, // no nested hook
    });
    return parseScore(outFile ? readFileSync(outFile, "utf8") : out);
  } catch {
    return null;
  } finally {
    if (outFile) {
      try {
        unlinkSync(outFile);
      } catch {}
    }
  }
}

// Models rarely answer with a bare integer. Strip the ways they decorate it,
// then take the LAST in-range number: preamble ("Step 1:", "...done thinking.")
// puts stray digits before the answer, never after it.
function parseScore(out) {
  const clean = out
    .replace(/\x1B\[[0-9;?]*[a-zA-Z]/g, "") // ANSI (ollama spinners on a TTY)
    .replace(/<think>[\s\S]*?<\/think>/gi, "") // reasoning-model scratchpad
    .replace(/[\s\S]*\.\.\.done thinking\./i, ""); // ollama's thinking marker
  // \b so a longer run of digits is rejected outright rather than sliced into
  // an in-range fragment — "9999" must not become 9.
  const nums = clean.match(/\b\d{1,3}\b/g);
  if (!nums) return null;
  for (let i = nums.length - 1; i >= 0; i--) {
    const n = parseInt(nums[i], 10);
    if (n >= 0 && n <= 100) return n;
  }
  return null;
}

function loadState(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return { warned: "", driftWarned: false, semCount: 0 };
  }
}
function saveState(dir, file, state) {
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(state));
  } catch {}
}

function emit(msg, extraContext) {
  const out = { systemMessage: msg, suppressOutput: true };
  if (extraContext) {
    out.hookSpecificOutput = {
      hookEventName: "UserPromptSubmit",
      additionalContext: extraContext,
    };
  }
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

function main() {
  if (OFF) return ok();
  const input = readStdin();
  const tpath = input?.transcript_path;
  if (!tpath || !existsSync(tpath)) return ok();

  let lines;
  try {
    lines = readFileSync(tpath, "utf8").split("\n").filter(Boolean);
  } catch {
    return ok();
  }
  if (!lines.length) return ok();

  const stateDir = GUARD_DIR;
  const sid = (input?.session_id || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stateFile = join(stateDir, `${sid}.json`);

  // Prefer the authoritative context info the status line shares (correct
  // window per model, e.g. 1M). Fall back to transcript sum + WINDOW default.
  let tokens = contextTokens(lines);
  let pct = tokens / WINDOW;
  try {
    const ctx = JSON.parse(readFileSync(join(stateDir, `${sid}.ctx.json`), "utf8"));
    if (ctx && ctx.window) {
      tokens = ctx.tokens ?? tokens;
      pct = typeof ctx.pct === "number" ? ctx.pct / 100 : tokens / ctx.window;
    }
  } catch {}
  const loop = loopSignal(lines);
  const pctStr = `${Math.round(pct * 100)}%`;
  const tokStr = tokens.toLocaleString();
  const state = loadState(stateFile);

  // --- Layer 1: deterministic size / loop (free, always on) ---
  let level = null;
  if (pct >= HARD) level = "hard";
  else if (pct >= WARN) level = "soft";
  else if (loop) level = "loop";

  if (level) {
    const rank = { soft: 1, loop: 2, hard: 3 };
    if (rank[level] > (rank[state.warned] || 0)) {
      state.warned = level;
      saveState(stateDir, stateFile, state);
      if (level === "hard") {
        return emit(
          `⚠️  Context is ~${pctStr} full (~${tokStr} tokens). To keep costs down, ` +
            `consider starting a NEW conversation for a fresh task, or /compact to ` +
            `keep this thread's context.`,
          "[context-guard] This conversation's context window is over 80% full. " +
            "If the user's new request starts a distinct task, suggest they open a new " +
            "conversation; if they want to continue here, suggest /compact. One line max.",
        );
      }
      if (level === "soft") {
        return emit(
          `ℹ️  Context is ~${pctStr} full (~${tokStr} tokens). If you're switching ` +
            `topics, a new conversation is cheaper than carrying this history. ` +
            `Otherwise /compact will summarize what's here.`,
        );
      }
      return emit(
        `ℹ️  Heads up: ${loop}. If this task has stalled, it may be worth re-framing ` +
          `the request or starting a fresh conversation rather than pushing on.`,
      );
    }
    return ok(); // already warned at this level or higher
  }

  // --- Layer 2: semantic drift (gated + throttled + one Haiku call) ---
  // Keeps refreshing state.driftScore for the status-line meter on each check;
  // only the user-facing message is locked to once per session (driftWarned).
  if (!SEMANTIC || pct < SEM_FLOOR || !input?.prompt || !input.prompt.trim()) {
    return ok();
  }
  state.semCount = (state.semCount || 0) + 1;
  if (state.semCount % SEM_EVERY !== 0) {
    saveState(stateDir, stateFile, state); // throttle: only every Nth prompt
    return ok();
  }
  const original = firstUserText(lines);
  if (!original || original.trim() === input.prompt.trim()) {
    saveState(stateDir, stateFile, state);
    return ok();
  }
  const score = driftScore(original, input.prompt);
  if (score !== null) state.driftScore = score;
  if (score !== null && score >= DRIFT_WARN && !state.driftWarned) {
    state.driftWarned = true;
    saveState(stateDir, stateFile, state);
    return emit(
      `ℹ️  This prompt looks like a different task than where this conversation ` +
        `started (drift ${score}/100, ~${pctStr} of context used). Starting a NEW ` +
        `conversation for it is usually cheaper and cleaner than continuing here.`,
    );
  }
  saveState(stateDir, stateFile, state);
  return ok();
}

main();
