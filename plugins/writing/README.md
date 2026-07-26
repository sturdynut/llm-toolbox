# writing

Skills for long-form technical writing — drafting, proofreading, and adversarial review.

| Skill | Role |
|---|---|
| `proofread` | Copyedit for spelling, capitalization, punctuation, and dictation artifacts. Two tiers: mechanical errors fixed in place, wording changes proposed for approval only. Never smooths voice. |
| `poke-holes` | Red-team the *argument* before publishing — contradictions, overclaims, unsupported claims, factual errors, and the obvious "well, actually…" objections. Reports, never edits. |

They run in that order: `proofread` cleans the prose, `poke-holes` is the last gate before
it posts.

## Two layers

Both skills are built as a **generic foundation plus a personal layer**. The foundation
ships here and is published; the personal layer never enters this repo.

| Layer | Lives in | Contains |
|---|---|---|
| Foundation | `<skill>/references/*.md` | Conventions with objectively right answers — tech proper-noun casing, dictation artifacts, punctuation and number rules, claim types that need verifying, generic weak spots. |
| Personal | `<drafts-repo>/.claude/*.local.md` | This author's name spelling, employer, audience floor, voice patterns, published positions. |

Lookup order is `<cwd>/.claude/<name>.local.md`, then `~/.claude/<name>.local.md`. **The
local file wins on any conflict.**

- `proofread` → `proofread-style.local.md`
- `poke-holes` → `poke-holes-context.local.md`

Gitignore `*.local.md` in the drafts repo. Nothing author-specific is ever appended to
`references/` — that content is shared and published.

## How the personal layer gets built

The skills **solicit it, after a pass, never before.** A cold questionnaire asks an author
to introspect about habits they aren't aware of having. Running the pass first means the
skill is holding evidence: constructions it saw three times, proper nouns it guessed at,
style forks where the generic default may be wrong. It asks about those, quoting the
passage, capped at three or four questions, once per session — and drops it if declined.

Answers are written to the local file and appended to on later passes, so both skills get
sharper over time without that sharpening leaking into the published repo.

Without any local override the skills still work; `poke-holes` infers the audience's
technical floor from the draft's own vocabulary and states which floor it assumed.
