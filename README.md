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

## Plugins

| Plugin | What it does |
|---|---|
| **writing** | Proofreading and adversarial review for long-form technical writing. `proofread` fixes mechanical errors without touching voice; `poke-holes` red-teams the argument before publishing. |
| **ui** | UI, UX, and front-end design work. |
| **harness** | Session hygiene. `session-handoff` extracts a context window's decisions, dead ends, and verified state into a markdown briefing and puts a primer prompt for the next session on your clipboard. (The context/cost sensors that used to live here are in `incubator/harness-sensors/` pending fixes.) |
| **authoring** | Tooling for building the marketplace itself. `skill-factory` takes a skill from intent to shipped — whether it should be a skill at all, which plugin it belongs to, the description that decides triggering, and trigger evals graded in a single batched model call. |
| **pairing** | Collaboration protocols that split the work between you and Claude. `pair-tdd` runs ping-pong TDD: one side writes the test, the other makes it pass, and the file boundary is the role boundary. `brainstorm-to-spec` runs a five-phase gated interview that turns a rough idea into a written spec — and treats disagreement, not agreement, as the sign it worked. |

Each is independently enable/disableable via `/plugin`.

## Layout

See [CLAUDE.md](./CLAUDE.md) for the taxonomy and the rules that keep it stable.
