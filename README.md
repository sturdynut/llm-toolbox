<img src="assets/brand/llm-toolbox-crossed-tools.png" alt="LLM Toolbox — crossed ivory hammer and wrench on a rust-red tile" width="160" height="160">

# LLM Toolbox

A personal [Claude Code](https://claude.com/claude-code) marketplace — plugins and MCP
servers, versioned in one place and installed rather than scattered across `~/.claude/`.

## Install

```
/plugin marketplace add sturdynut/llm-toolbox
/plugin install writing@llm-toolbox
/plugin install ui@llm-toolbox
/plugin install harness@llm-toolbox
/plugin install pairing@llm-toolbox
/plugin install authoring@llm-toolbox
```

On the machine where you develop this repo, add it by path instead so edits are live:

```
/plugin marketplace add ~/Code/llm-toolbox
```

Each plugin is independently enable/disableable via `/plugin`.

## Plugins

| Plugin | Slice |
|---|---|
| **writing** | Drafting, proofreading, and adversarial review for long-form technical writing. Carries personal calibration in `references/` that is meant to grow as patterns emerge. |
| **ui** | UI, UX, and front-end design. |
| **pairing** | Collaboration protocols — how work is divided between you and Claude, and what each side is forbidden to touch. Sliced by *working arrangement* rather than subject, so the skills here are mostly constraints. |
| **harness** | Session hygiene: how a context window starts, and how it ends. |
| **authoring** | Tooling for building the marketplace itself. |

## Skills

| Skill | Plugin | Invoke | What it does |
|---|---|---|---|
| `proofread` | writing | either | Fixes mechanical errors in place and proposes wording changes separately. Never touches voice — no tightening, no raising the register. |
| `poke-holes` | writing | either | Red-teams a draft's argument before it ships: contradictions, unsupported claims, and the "well, actually" a sharp reader will raise. Reports; never edits. |
| `ui-house-style` | ui | either | Critiques a real UI — source, and the running app when it can reach it — for the generic patterns that make an interface read as machine-generated, then defines and optionally implements a house style fitted to what the product is actually for. |
| `pair-tdd` | pairing | either | Ping-pong TDD. You hold one role, Claude holds the other, and the file boundary *is* the role boundary: the implementer never edits a test. |
| `brainstorm-to-spec` | pairing | either | Five gated phases from rough idea to written spec — align, surface assumptions by blast radius, define how you'll know it works, identify users, then revisit the first three. Treats disagreement, not agreement, as the sign it worked. |
| `session-handoff` | harness | `/harness:session-handoff` | Extracts a context window's decisions, dead ends, constraints, and verified state into a briefing, then puts a primer prompt for the next session on your clipboard. Grades every claim verified / claimed / assumed. |
| `skill-factory` | authoring | either | Takes a skill from intent to shipped: whether it should be a skill at all, which plugin owns it, the description that decides triggering, and trigger evals graded in one batched model call. |

"Either" means Claude can invoke it and you can type `/<plugin>:<skill>`. `session-handoff`
is user-only because it writes files and clobbers your clipboard — see
[CLAUDE.md](./CLAUDE.md) for how that choice is made.

## Testing that a skill triggers

Model-invocable skills carry `evals/trigger-evals.json` — real phrasings that should fire
it, and near misses that should not. Grade a suite:

```
node plugins/authoring/skills/skill-factory/scripts/trigger-eval.mjs <skill-dir>
```

One model call for the whole suite, with MCP schemas and settings stripped from the
grader. Roughly a cent per run.

## Not installed

`incubator/` is a holding pen — nothing in it is exposed by the marketplace. It currently
holds **`harness-sensors/`**: two context/cost hooks and a status line, pulled out of the
`harness` plugin after an audit against 246 local transcripts found a warning-suppression
bug and a drift layer that had spent ~$4.46 to emit one warning. The code runs; its README
carries the measurements and the fix list.

`servers/` is the development tree for MCP servers. Plugins depend on the *published*
package rather than a sibling path, so a plugin keeps working if it's ever distributed on
its own.

## Layout

See [CLAUDE.md](./CLAUDE.md) for the taxonomy and the rules that keep it stable.
