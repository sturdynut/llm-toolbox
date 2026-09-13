---
name: skill-factory
description: >-
  Build, place, and pressure-test a Claude Code skill in this marketplace —
  decide whether the thing should be a skill at all, pick its plugin and
  invocation mode, write the description that makes it trigger, keep the body
  under budget, and generate trigger evals with near-miss negatives. Use when
  asked to create, write, scaffold, or improve a skill, to turn a workflow or
  this conversation into a skill, to fix a skill that doesn't trigger or
  triggers on the wrong things, to review a SKILL.md before shipping it, or to
  decide whether something belongs as a skill, a hook, an agent, or an MCP tool.
argument-hint: "[skill-name or description]"
---

# skill-factory

A skill is a **process the agent re-runs**, not an output it reproduces. Everything here
serves one question: when this fires in a fresh context window six months from now, will
it produce the same behaviour?

The long-form rules and their sources are in
[references/authoring-rules.md](references/authoring-rules.md) — read it before writing
the body, and when a judgment call in any step below is close.

## 0. Should this be a skill at all?

Check the taxonomy in the repo's `CLAUDE.md` before writing anything:

| It's not a skill if… | It's a… |
|---|---|
| It must happen every time, regardless of model judgment | hook |
| It needs its own context window, a restricted tool set, or parallelism | agent |
| It needs code, auth, or network that Bash/Read can't reach | MCP tool |
| It's data another skill reads | reference file in that skill's `references/` |

Nearly everything else is a skill. If it *is* a hook or an agent, say so and stop —
building the wrong artifact well is worse than building nothing.

## 1. Capture intent

**If the workflow just happened in this conversation, mine it first.** The corrections the
user made, the tools used, the order, the thing you got wrong the first time — that is the
skill. Ask only for what the transcript doesn't answer.

Otherwise ask four questions, and wait for answers:

1. What should this let Claude do that it doesn't do well now?
2. What does the user type when they want it? (Their words, not a paraphrase.)
3. What's the output — a file, a report, an edit, a decision?
4. What's the nearest thing it must **not** fire on?

Question 4 is the one people skip and the one that decides whether the skill is usable.

## 2. Place it

**Plugin choice.** `writing`, `ui`, `harness`, `pairing`, `authoring` — pick by domain, not
by convenience. If it fits none, it goes in `incubator/<name>/` until it's been used twice;
that's this repo's promotion rule. Note the trade: nothing in `incubator/` is installable,
so a skill you need to *run* has to live in a plugin.

**One home.** If two plugins both want it, the domain slice is wrong. Plugins can't declare
dependencies on each other, so a "shared" skill is a convention nobody enforces.

**Namespacing.** Slash commands are namespaced by plugin; **skill names are not** — they
land in one global pool with every marketplace installed on the machine. Before settling on
a name, check it doesn't collide:

```sh
ls ~/.claude/skills ~/.claude/plugins/*/skills 2>/dev/null | sort -u
```

Prefix anything generic. `handoff` is a collision waiting to happen; `session-handoff`
isn't. Prefer a noun phrase or gerund; never `helper`, `utils`, `tools`.

## 3. Choose invocation

Two flags, and the choice is about which budget you spend:

| Mode | Frontmatter | Costs |
|---|---|---|
| Both (default) | omit both flags | description loaded every turn, forever |
| Model-only | `user-invocable: false` | same, for background knowledge |
| User-only | `disable-model-invocation: true` | zero context, but **you** are the index |

A model-invoked description is permanent context load on every session — it earns that by
being reachable without you remembering it exists. A user-invoked skill is free and
invisible; you have to recall it. Pick user-only when the skill has real side effects
(deploys, commits, sends, clobbers a clipboard) or when it only ever fires by hand.

## 4. Write the description

**This is the highest-leverage text in the skill** and the only part always in context. Max
1,024 characters. It decides triggering; the body only decides behaviour.

- **Third person.** It's injected into a system prompt. Not "I can help you…", not "You can
  use this to…" — "Extracts…", "Builds…".
- **Front-load the trigger words.** The decision happens in the first clause.
- **What it does *and* when to use it**, with the user's actual phrasings.
- **Be slightly pushy.** The observed failure mode is *under*-triggering. "Use this whenever
  the user mentions X, Y, or Z, even if they don't say 'skill'."
- **State the near-miss exclusion** when one exists: `pair-tdd` earns its keep by saying it
  is *not* for "write unit tests for X."
- **One trigger per branch.** Three synonyms for the same case is one branch written three
  times; spend the characters on a branch you haven't covered.

## 5. Write the body

Read [references/authoring-rules.md](references/authoring-rules.md) now if you haven't.
The four rules that do most of the work:

**Match freedom to fragility.** Many valid paths → prose and principles. One safe path →
the exact command, and say not to vary it. Guessing wrong in either direction is the most
common defect: rigid steps for an open task make the skill brittle, loose prose for a
fragile one makes it useless.

**Assume Claude is smart.** Cut any sentence the model already obeys by default. The test
is behavioural, not aesthetic: does this line change what happens versus no line at all?
If two people disagree, settle it by running the skill, not by arguing.

**Prompt the positive.** "Don't write long comments" drags long comments into context and
makes them *more* available. Write "keep comments to one line." Reserve prohibitions for
hard guardrails you can't phrase positively — and pair them with the positive target.

**Progressive disclosure, one level deep.** Body under 500 lines. Push detail into
`references/*.md`, linked directly from SKILL.md — never a reference that points at another
reference, because nested files get skimmed with `head` instead of read. Give any reference
over 100 lines a table of contents.

Layout, when you need more than one file:

```
skills/<name>/
  SKILL.md          # navigation + the steps
  references/*.md   # consulted on demand, one level deep
  scripts/*         # executed, not read into context
  assets/*          # templates and fixtures used in output
  evals/trigger-evals.json
```

Say explicitly which one a script is: "Run `clip.sh`" (execute) or "See `clip.sh` for the
fallback order" (read). Prefer instructions over scripts unless you need determinism or
a tool the model can't reach.

## 6. Generate trigger evals

Every model-invocable skill in this repo carries `evals/trigger-evals.json`:

```json
[
  {"query": "the user's real phrasing", "should_trigger": true},
  {"query": "an adjacent task this must NOT hijack", "should_trigger": false}
]
```

Write **8–10 positives and 8–10 negatives**. The negatives are the work. A negative that
is obviously unrelated ("what's the weather") tests nothing — write **near misses**: the
task that shares vocabulary but wants different behaviour. For a `proofread` skill the
negative isn't "book me a flight", it's "rewrite this paragraph to be punchier."

Run them in one batched call:

```sh
node "${CLAUDE_PLUGIN_ROOT}/skills/skill-factory/scripts/trigger-eval.mjs" <path-to-skill-dir>
```

It grades every case in a single Haiku request with MCP schemas and settings stripped, so
the whole suite costs about one cent. Fix the *description* when a case fails — the body
has no effect on triggering.

## 7. Ship checklist

- [ ] It isn't better as a hook, agent, or MCP tool
- [ ] Name doesn't collide in the global pool; generic words prefixed
- [ ] Description: third person, triggers front-loaded, what + when, near-miss exclusion
- [ ] Invocation mode matches the side effects
- [ ] Body under 500 lines; references one level deep; long references have a TOC
- [ ] Every line changes behaviour versus no line
- [ ] Guidance is positive, not prohibitive
- [ ] Script vs. read intent stated for each script
- [ ] Trigger evals written, near-miss negatives included, suite passes
- [ ] Registered: plugin's `README.md`, root `README.md`, `.claude-plugin/marketplace.json`
      if the plugin is new

Then say where it landed and how to invoke it. Don't run the new skill to "demonstrate" it
unless asked.
