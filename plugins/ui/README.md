# ui

UI, UX, and front-end design work.

Empty for now. Use `plugins/writing` as the reference implementation — a plugin is a
`.claude-plugin/plugin.json` plus a `skills/` tree; nothing else is required.

To add the first skill:

```
plugins/ui/skills/<name>/
├── SKILL.md          # frontmatter: name, description (the description is the trigger)
└── references/       # optional supporting material the skill reads
```

See the root `CLAUDE.md` for frontmatter fields and the rule on what belongs in a skill
versus an agent, hook, or MCP tool.
