# harness

Plugins that change how Claude Code itself runs — context and cost control, session
hygiene. Named for the layer it operates on rather than any one artifact, so future
statusline, session-report, and settings tooling have an obvious home here.

## Context guard

`hooks/context-guard.mjs`, wired as a `UserPromptSubmit` hook. Two layers:

1. **Deterministic, free, always on.** Estimates context fill from the last assistant
   message's `usage`, and scans the tail for a loop signal (same file edited repeatedly,
   repeated tool errors).
2. **Semantic drift, optional, one small model call.** Only fires in the band
   `[SEM_FLOOR, WARN)`, throttled to every Nth qualifying prompt. Compares the *first*
   prompt (the original goal) against the current one to catch a topic switch. See
   **Drift-check providers** below.

All warnings are throttled through a per-session state file, so it never nags. It is a
sensor: it emits a message and never blocks a prompt.

### Tunables

Set in `~/.claude/settings.json` under `env`, or in the shell.

| Variable | Default | Meaning |
|---|---|---|
| `CONTEXT_GUARD_OFF` | — | `1` disables the whole hook |
| `CONTEXT_GUARD_WINDOW` | `200000` | context window, tokens |
| `CONTEXT_GUARD_WARN` | `0.65` | soft threshold, fraction |
| `CONTEXT_GUARD_HARD` | `0.80` | hard threshold, fraction |
| `CONTEXT_GUARD_SEMANTIC` | on | `0` disables the drift layer |
| `CONTEXT_GUARD_SEM_FLOOR` | `0.40` | floor for drift checks |
| `CONTEXT_GUARD_SEM_EVERY` | `4` | run a drift check every Nth qualifying prompt |
| `CONTEXT_GUARD_PROVIDER` | `claude` | `claude`, `ollama`, or `codex` |
| `CONTEXT_GUARD_MODEL` | per-provider | model for the drift check |
| `CONTEXT_GUARD_CMD` | — | custom command; overrides `PROVIDER` |
| `CONTEXT_GUARD_TIMEOUT` | `8000` | ms budget for the drift call |

## Drift-check providers

**The drift check is the only part of this plugin that sends your text anywhere.** It
transmits two things — your first prompt of the session and your current prompt, each
clipped to 600 characters — to whichever engine grades them. Everything else in this
plugin is local file reads.

All four built-in providers were measured on the same pair of prompts — an unrelated topic
switch, and a direct follow-up. Wider separation is better:

| Provider | Prompts go to | Latency | Unrelated | Follow-up | Gap |
|---|---|---|---|---|---|
| `claude` (default) | Anthropic, existing subscription auth | ~4s | 100 | 2 | 98 |
| `ollama` | **nowhere — stays on the machine** | ~1–4s | 85 | 43 | 42 |
| `codex` | OpenAI, via your codex auth | ~5.5s | 100 | 15 | 85 |
| `cursor` | Cursor, via your cursor-agent auth | ~6s | 100 | 0 | 100 |

All four cleared the `DRIFT_WARN=60` threshold correctly. `ollama` is the noisiest by a
wide margin — its follow-up score of 43 is uncomfortably close to the threshold — but it
is the only one that keeps your prompts on the machine, and it is the fastest.

**`claude` (default).** Shells out to `claude -p` with Haiku, riding your existing
subscription auth — no API key needed. Same terms as the session itself.

**`ollama` — fully local.** Prompt text never leaves the machine.

```sh
CONTEXT_GUARD_PROVIDER=ollama
CONTEXT_GUARD_MODEL=llama3.2      # default for this provider
```

**Use a small instruction-following model.** Reasoning models blow the budget —
`qwen3:4b` took 25s on the same prompt, well past the hook's 15s ceiling, and its
`...done thinking.` preamble has to be stripped before the score can be read.

Local models are also *noisier*. On two equivalent prompts `llama3.2` returned 100 and 60.
Fine for a threshold that only fires above 60, but do not read the number as precise.

**`codex`.** The slowest option, and the only one that is an *agent* rather than a
completion endpoint — so it is fenced in:

```sh
CONTEXT_GUARD_PROVIDER=codex
CONTEXT_GUARD_TIMEOUT=12000       # 8s default is too tight for ~5.5s calls
```

`--ephemeral` (no session files), `-s read-only`, and `--cd` into an empty scratch dir so
the grader has no source tree to wander into — left alone it runs with your repo as its
workdir. Reasoning effort is pinned to `low`, since the default is `high` and this is a
one-integer question; `minimal` is rejected outright by gpt-5.5. The score is read from
`--output-last-message`, because codex's stdout carries a banner and a token count that
would otherwise have to be fished out of the chrome.

Leave `CONTEXT_GUARD_MODEL` unset to use whatever your codex config selects.

**`cursor`.** Also an agent, and the sharpest discriminator measured.

```sh
CONTEXT_GUARD_PROVIDER=cursor
CONTEXT_GUARD_TIMEOUT=12000
```

Note that `cursor-agent -p` on its own has, in its own words, "access to all tools,
including write and shell" — not something to hand a hook that fires unattended. It
therefore runs in `--mode ask` (read-only Q&A) with `--workspace` pointed at an empty
scratch dir, plus `--trust` to suppress the workspace-trust prompt that would otherwise
hang the hook waiting for input. Its stdout is a bare number, so unlike codex it needs no
output file.

Set `CONTEXT_GUARD_MODEL` to a cursor model name (e.g. `gpt-5`, `sonnet-4-thinking`) or
leave unset for the account default.

**`CONTEXT_GUARD_CMD` — anything else.** Any command that reads the grading prompt on
**stdin** and prints a number 0–100:

```sh
CONTEXT_GUARD_CMD='my-llm-cli --model whatever'
```

Run via `sh -c`, so pipes and flags work. The prompt is passed on stdin and never
interpolated into the command string — there is nothing to shell-escape. This is the path
for Cursor, LM Studio, a hosted endpoint, or anything else; no examples are given for
those because none were verified here.

**Or turn it off:** `CONTEXT_GUARD_SEMANTIC=0` keeps layer 1 (context fill and loop
detection, both free and fully local) and disables all outbound calls.

### Score parsing

Models rarely answer with a bare integer, so the response is stripped of ANSI escapes and
`<think>` blocks, then the **last** in-range number wins — preamble like `Step 1:` puts
stray digits before the answer, never after it. Digit runs longer than three are rejected
outright rather than sliced, so a garbage `9999` yields no score instead of a bogus `9`.

Note the timeout relationship: `CONTEXT_GUARD_TIMEOUT` (8s) must stay below the hook's own
`timeout` in `hooks.json` (15s), or Claude Code kills the hook before the subprocess
timeout can fire and the failure is silent.

Disabling the plugin via `/plugin` turns the hook off entirely; `CONTEXT_GUARD_OFF=1` is
the per-session escape hatch.

## Session weight

`hooks/session-weight.mjs`, wired as a `SessionStart` hook. Where the context guard
watches the *conversation* getting fat, this watches the *baseline* being fat — the cost
every session pays before you type a word, which is invisible precisely because it arrives
before the first prompt.

Deterministic and free; it reads files and estimates at ~4 chars/token. No model call.

Measures, and attributes per file:

- the **CLAUDE.md chain** — `~/.claude/CLAUDE.md`, plus every `CLAUDE.md` and
  `CLAUDE.local.md` from cwd up to `$HOME`
- **`@`-imports** inside those files, followed recursively and marked `(@import)`. This is
  the usual hiding place: a 3-line `CLAUDE.md` that pulls in a 9k-token reference doc.
- **skill and agent descriptions** in `~/.claude` and `<project>/.claude`. Only YAML
  frontmatter is counted, because only frontmatter is loaded up front — a 75KB `SKILL.md`
  with a tight description is cheap; a short one with a rambling description is not. That
  is the opposite of most people's intuition, so the hook counts what actually loads.

It warns when the total crosses `SESSION_WEIGHT_WARN` **or** any single file exceeds
`SESSION_WEIGHT_FILE`, ranks the offenders, and names the file to go edit.

**Not measured:** MCP tool schemas and installed-plugin skills. Both are real and often
dominant costs, but neither is knowable from disk without resolving what's enabled and
connecting to servers. `/context` gives the true total; this hook tells you which file
*you control* is the problem. The message says so rather than implying the number is
complete.

It fires only on `startup` and `clear` — `resume` and `compact` re-enter an existing
conversation, where the warning would be noise. Warnings are throttled by a fingerprint of
what was measured, so an ignored warning stays quiet until the underlying files actually
change (or `SESSION_WEIGHT_QUIET_H` elapses).

### Tunables

| Variable | Default | Meaning |
|---|---|---|
| `SESSION_WEIGHT_OFF` | — | `1` disables the hook |
| `SESSION_WEIGHT_WARN` | `10000` | warn above this many estimated tokens |
| `SESSION_WEIGHT_FILE` | `4000` | flag any single file above this |
| `SESSION_WEIGHT_QUIET_H` | `24` | hours to stay quiet after warning |

## Status line

`statusline/statusline.py` renders the status line, including a context-fill meter and a
drift score fed by `context-guard.mjs`. All three components share state through a
hardcoded directory:

```
/tmp/claude-context-guard
```

`GUARD_DIR` is duplicated as a literal in each file and must stay in sync. It is hardcoded
to `/tmp` rather than `os.tmpdir()` because on macOS `os.tmpdir()` resolves to `$TMPDIR`,
not `/tmp`. Now that all three live in this plugin, that constant is at least reviewable
in one place — but it is still three copies, so change them together.

**A plugin cannot declare a status line.** No plugin in the official marketplace supplies
one, so `settings.json` must point at the file by absolute path:

```json
"statusLine": {
  "type": "command",
  "command": "python3 /path/to/llm-toolbox/plugins/harness/statusline/statusline.py",
  "padding": 0
}
```

That path is machine-specific and does not travel with the plugin — it needs setting by
hand on each machine, and it keeps working even when the plugin is disabled. Disabling
`harness` turns off both hooks but leaves the status line running.

## Migration (done)

Previously `~/.claude/hooks/context-guard.mjs` and `~/.claude/statusline.py`, wired by
absolute path in `~/.claude/settings.json`. Both now live here; the global
`UserPromptSubmit` entry was removed (leaving it would have fired the hook twice per
prompt, doubling the Haiku drift call) and `statusLine` was repointed at this plugin.
Backup of the original settings: `~/.claude/settings.json.pre-llm-toolbox`.
