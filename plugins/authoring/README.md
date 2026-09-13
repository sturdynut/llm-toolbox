# authoring

Tooling for building the marketplace itself. Named for the activity rather than any one
artifact, so future plugin-scaffolding, eval-running, and description-optimizing tools have
an obvious home.

## skill-factory

`skills/skill-factory/`, available to you and to Claude.

Walks a skill from intent to shipped: whether the thing should be a skill at all (or a
hook, an agent, an MCP tool), which plugin it belongs to, model- vs user-invocation, the
description that decides triggering, a body that stays under budget, and trigger evals
with near-miss negatives.

`references/authoring-rules.md` is the long-form reference — Anthropic's authoring docs and
`skill-creator`, Matt Pocock's `writing-for-agents`, and OpenAI's Codex skills guidance,
distilled and attributed. The SKILL.md stays navigational and links to it once.

### Trigger evals

Every model-invocable skill in this repo carries `evals/trigger-evals.json` — positive and
negative phrasings, where the negatives are near misses rather than obviously unrelated
requests. To grade a suite:

```sh
node plugins/authoring/skills/skill-factory/scripts/trigger-eval.mjs <skill-dir>
```

It grades every case in **one** Haiku request. Batching is the point: a call per case turns
a 20-case suite into 20 subprocess spawns for an answer that fits in one response. The call
goes out with `--strict-mcp-config --setting-sources ""` so the grader doesn't inherit this
machine's MCP schemas, hooks, or `CLAUDE.md` chain — measured at 26.5k input tokens without
those flags versus 21.4k with, and a 63% lower bill.

Only the description is shown to the grader, because only the description decides
triggering. A failing case is a description bug. Output separates under-triggering (the
user's phrasing is missing) from over-triggering (a boundary is missing).

Exit status is 0 on a clean sweep, 1 on any failure, 2 on a setup problem.
