---
name: session-handoff
description: >-
  Extract what this context window knows — goal, decisions and their reasoning,
  dead ends, constraints, verified state, next action — into a durable markdown
  handoff file, then generate a primer prompt for a fresh session and copy it to
  the clipboard. Use when the context window is filling up, when the context
  guard warns about drift or fill, before /clear or a deliberate restart, or when
  the user asks to save, checkpoint, or hand off the session.
disable-model-invocation: true
argument-hint: "[output-path]"
---

# session-handoff

Transplant this session's *understanding* into a new context window.

The repo survives a context reset on its own — code, tests, and commits are already on
disk. What dies is everything that was only ever in the conversation: why an approach was
chosen, what was tried and abandoned, what the user actually asked for, and which claims
have been verified versus assumed.

**That gap is the entire deliverable.** A handoff that summarizes what the next session
could read for itself has cost tokens and saved nothing.

Write for a competent stranger who has this repo checked out and no memory of the last
three hours.

---

## 1. Resolve the output path

If `$1` is given, use it. Otherwise:

```
.claude/handoffs/<YYYY-MM-DD-HHmm>-<3-5-word-kebab-slug>.md
```

relative to the project root. `mkdir -p` the directory. The slug names the *work*
(`retry-backoff-in-fetch-client`), not the event (`handoff`, `session-notes`).

Timestamped filenames never collide, so running this twice in one session is safe and
leaves both checkpoints intact.

Mention once, if `.claude/handoffs/` is not already ignored, that the user may want it in
`.gitignore` — then move on. Do not edit `.gitignore` yourself.

## 2. Harvest from the conversation

Read `references/template.md` for the exact section order and skeleton. What goes in each
section is a judgment call; these are the buckets, roughly in descending value:

**Dead ends.** The most expensive thing to rediscover and the first thing lost. Every
approach that was tried and abandoned, with the reason it failed. "Tried `X`; it fails
because the API returns `null` for archived rows" saves the next session the whole detour.

**Decisions and their reasoning.** Not just what was chosen — what was rejected, and why.
A decision without its alternative reads as arbitrary and will be relitigated.

**User constraints and preferences.** Anything the user said about how the work must be
done: libraries that are off-limits, patterns they dislike, scope they explicitly
excluded, style they corrected you on. **Quote them verbatim** where the exact wording
carries the constraint. Paraphrase loses the teeth.

**Verified state.** What is actually done and proven — with the evidence. Grade every
claim (see step 3).

**The next action.** One concrete thing, specific enough to start on without a decision.
"Wire the new `RetryPolicy` into `src/client.ts:142`" — not "continue the retry work."

**Open questions.** Anything genuinely undecided, and who has to decide it. If it is
waiting on the user, say so explicitly, along with what you need from them.

**Orientation.** Key files with paths and line numbers, and the environment facts that
took effort to establish — the command that actually runs the tests, the port the dev
server is on, the flag that has to be set. Skip anything discoverable in five seconds.

Then capture the repo state factually rather than from memory:

```sh
git status --short && git branch --show-current && git log --oneline -5
```

## 3. Grade every claim

Three states, and the labels are not decoration — the next session will act on them:

- **Verified** — a command was run and its output was seen. Name the command.
- **Claimed** — written, edited, or asserted, but never executed or checked.
- **Assumed** — believed on inference; nobody confirmed it.

If you cannot tell which of the three a statement is, it is *assumed*. Writing "tests
pass" for a suite you never ran is the single most damaging thing this file can contain,
because the next session will build on it and lose an hour finding out otherwise.

## 4. Exclusions

- **No chronology.** "First I looked at X, then I tried Y" is a transcript, not a
  briefing. State conclusions; the sequence only matters where a dead end explains it.
- **No file contents.** Reference `path:line`. The next session can open it.
- **No code blocks over ~10 lines**, and only where the exact text matters (a config
  snippet, a signature, a failing assertion).
- **Nothing you did not establish this session.** No plausible-sounding filler for a
  section you have nothing for — delete the heading instead. An empty section is honest;
  an invented one is a trap.
- **No praise, preamble, or wrap-up prose.**

Target under ~1,500 words. A handoff that costs as much to read as the session it replaces
has defeated its own purpose.

## 5. Write the primer

A separate file alongside the handoff: same path, `.primer.md` extension. It is what gets
pasted into the new session, so it must stand on its own — the skeleton is in
`references/template.md`.

It carries, in this order: where the work is (repo, branch, worktree), an instruction to
read the handoff file by **absolute path** before doing anything, the goal in one
sentence, the next action, the hard constraints, and a short do-not-redo list.

End it by telling the new session to state its plan before editing. A primed session is
confident and wrong at speed if you let it start cold.

Keep it under 250 words. It is a pointer with enough context to survive if the file is
never opened — not a second copy of the handoff.

## 6. Copy to the clipboard, and check

```sh
"${CLAUDE_PLUGIN_ROOT}/skills/session-handoff/scripts/clip.sh" < <primer-path>
```

The script handles macOS, Wayland, X11, and WSL, and fails loudly when no clipboard tool
exists. If it fails, print the primer in a fenced block so the user can copy it by hand —
and **say that the clipboard copy failed**. Silently reporting success here means the user
pastes whatever was in their clipboard beforehand into a fresh session.

## 7. Report

Four lines, nothing more:

- the handoff path
- the primer path
- clipboard: copied, or failed and why
- the one-sentence next action, so the user can sanity-check the framing before they burn
  a new session on it

Then stop. Do not start the next action — the point of this skill is that a *different*
context window does it.
