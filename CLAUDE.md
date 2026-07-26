# llm-toolbox

A Claude Code **marketplace**. The repo root is the marketplace; each directory under
`plugins/` is an installable plugin; `servers/` holds MCP servers as real packages.

```
.claude-plugin/marketplace.json   # this repo IS the marketplace
plugins/<domain>/                 # few, fat, domain-sliced
  .claude-plugin/plugin.json      # the only hard requirement
  skills/<name>/SKILL.md          # (+ references/, scripts/, assets/)
  agents/<name>.md
  hooks/hooks.json
  .mcp.json
servers/<name>/                   # MCP servers — Node ESM, own lifecycle
incubator/                        # not yet earned a plugin
```

## What goes where

| Type | Use when |
|---|---|
| **Skill** | Knowledge or a procedure. The default — nearly everything is a skill. |
| **Agent** | Needs its own context window, a restricted tool set, or parallelism. |
| **Hook** | Must happen every time, independent of model judgment. |
| **MCP tool** | Needs code, auth, or network that Bash/Read can't reach. |
| **Reference** | Data a skill reads. Lives in that skill's `references/`. |

**There is no `commands/` directory.** `.claude/commands/` is a legacy file layout —
commands and skills are loaded identically. Use `skills/<name>/SKILL.md` and control
invocation with frontmatter:

```yaml
---
name: skill-name
description: What it does and when to use it.   # this is what triggers it — be specific
disable-model-invocation: true   # user-only (/name). For side effects: deploy, commit, send.
user-invocable: false            # model-only. For background knowledge.
allowed-tools: Read, Grep, Glob  # restrict tool access
argument-hint: <draft-path>
context: fork                    # run in an isolated subagent
agent: Explore                   # which agent type when forked
---
```

Omit both invocation flags and the skill is available to you *and* to Claude. That's the
right default for most things.

## Rules

**One home per skill.** If two plugins want the same skill, either the domain slice is
wrong or it belongs in a shared plugin — and plugins can't declare hard dependencies on
each other, so "shared" is a convention enforced by documentation, not tooling.

**Namespacing.** Slash commands are namespaced by plugin automatically. **Skill names are
not** — they land in one global pool alongside every marketplace plugin installed on the
machine. Prefix anything generic.

**Promotion.** `incubator/` → a plugin once a thing has been used twice. Avoids both
premature taxonomy and permanent sprawl.

**Plugin paths.** Anything a plugin references on disk uses `${CLAUDE_PLUGIN_ROOT}`, never
an absolute path. Hooks are the usual offender.

## Domains

- **writing** — drafting, proofreading, adversarial review. Skills here carry personal
  calibration in `references/` that is meant to be appended to as patterns emerge.
- **ui** — UI, UX, front-end design.
- **harness** — modifies how Claude Code itself runs: context/cost control, session
  hygiene. Named for the layer it operates on, so future statusline/session tooling has an
  obvious home.

## Working on this repo

Add the marketplace **by local path**, not by GitHub URL:

```
/plugin marketplace add ~/Code/llm-toolbox
```

A GitHub-sourced marketplace is a clone that gets refreshed on update, which can clobber
in-place edits — and several skills here are designed to accumulate notes in `references/`.
A local-path marketplace points at this working tree, so edits are live and version
controlled. Use the GitHub source on other machines.

## MCP servers

Node ESM, `@modelcontextprotocol/sdk`, `node --test`, no transpile step — matching the
existing `tradingview-mcp` conventions.

Plugins reference servers by **published package**, not by sibling path:

```json
{ "mcpServers": { "foo": { "command": "npx", "args": ["-y", "@matti/foo-mcp"] } } }
```

A relative path from `plugins/x/.mcp.json` into `servers/` only resolves while the whole
repo is on disk, and breaks outright if a plugin is ever distributed via `git-subdir`.
`servers/` is the development tree; plugins depend on the published artifact.
