# LLM Toolbox

A personal [Claude Code](https://claude.com/claude-code) marketplace — plugins and MCP
servers, versioned in one place and installed rather than scattered across `~/.claude/`.

## Install

```
/plugin marketplace add sturdynut/llm-toolbox
/plugin install writing@llm-toolbox
/plugin install ui@llm-toolbox
/plugin install harness@llm-toolbox
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
| **harness** | Tunes how Claude Code itself runs. Two cost sensors: **context guard** warns when a session is filling its context window, looping, or has drifted off topic; **session weight** warns when your `CLAUDE.md` chain, its `@`-imports, or your skill descriptions are making *every* session start expensive — and names the file to trim. |

Each is independently enable/disableable via `/plugin`.

## Layout

See [CLAUDE.md](./CLAUDE.md) for the taxonomy and the rules that keep it stable.
