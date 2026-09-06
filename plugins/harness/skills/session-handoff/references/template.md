# Handoff template

Two files. Section order is fixed; **delete any heading you have nothing real for** rather
than filling it. Angle brackets are placeholders.

---

## A. The handoff — `<slug>.md`

```markdown
# Handoff — <what the work is>

**When:** <YYYY-MM-DD HH:mm> · **Repo:** <name> · **Branch:** <branch>
**Worktree:** <path, if not the main checkout>

## Goal

<One or two sentences. What "done" means — not what has been attempted. If the goal
shifted mid-session, state the current one, then note the original in one line.>

## Next action

<The single concrete thing to do next. A path, a function, a command.>

## State

| Item | Status | Evidence |
|---|---|---|
| <what> | verified / claimed / assumed | <command run, or why it's unproven> |

## Decisions

- **<Decision>** — <reasoning>. Rejected: <alternative> because <reason>.

## Dead ends

- **<What was tried>** — <how it failed>. <Whether it's worth revisiting, and under what
  condition.>

## Constraints

- <Hard requirement, environment limit, or scope exclusion.>
- > "<verbatim user quote where the exact wording is the constraint>"

## Open questions

- <Question> — needs: <user decision / an experiment / a missing fact>.

## Orientation

- `<path:line>` — <why this file matters>
- Tests: `<the command that actually works>`
- <Environment fact that took effort to establish.>

## Repo state at handoff

```
<git status --short>
<git log --oneline -5>
```
```

---

## B. The primer — `<slug>.primer.md`

Pasted verbatim into a fresh session. Under 250 words.

```markdown
Continuing work on <what> in <repo> (branch `<branch>`<, worktree `<path>`>).

Read `<absolute path to the handoff>` before doing anything else — it is the full
briefing, including what has already been ruled out.

**Goal:** <one sentence>

**Next action:** <the concrete thing>

**Constraints:**
- <hard constraint>
- <hard constraint>

**Do not redo:**
- <dead end, one line each — enough to recognize it, not to re-derive it>

**Already verified:** <the short list, with what proved it>

Read the handoff, then tell me your plan in three lines or fewer before you edit anything.
```
