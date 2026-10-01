---
description: How this repo is laid out as a Claude Code marketplace — plugin directories, plugin.json, skill frontmatter and invocation flags, where skills, agents, hooks and references go, the incubator promotion rule, and skill-name namespacing.
---
- Repo root is the marketplace (`.claude-plugin/marketplace.json`); each `plugins/<domain>/` is a plugin.
- Skills are `skills/<name>/SKILL.md`; there is no `commands/` directory. `disable-model-invocation: true` for side effects, `user-invocable: false` for background knowledge.
- Skill names share one global pool across every installed marketplace: prefix anything generic.
- `incubator/` → a plugin once used twice. Plugin paths use `${CLAUDE_PLUGIN_ROOT}`.
- Full rules: `CLAUDE.md` at the repo root.
