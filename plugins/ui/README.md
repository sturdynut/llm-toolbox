# ui

UI, UX, and front-end design work.

## Skills

### `ui-house-style`

Context-aware UI critique and transformation. Runs a four-phase loop —
**Context → Inspect → Critique → Change** — that reads what a product is trying to be
*before* judging it, gathers evidence from the strongest surface it can actually reach
(interactive browser → render-assisted → source-only), reports findings across four
categories, and defines a house style the team could apply to a screen it never saw.
The Change phase is opt-in and verifies against the *same* inspection manifest it
baselined with, so before/after claims are earned rather than asserted.

The thesis: most generated UIs aren't ugly, they just all speak in the same **accent**.
The specific tells shift era to era (candy-Duolingo → calm-sage); the phenomenon
doesn't. So the four categories and scope layers are the durable spine, and the tell
catalog in `references/` is explicitly held loosely.

```
skills/ui-house-style/
├── SKILL.md
├── references/critique-taxonomy.md   # category definitions, scope layers, tell catalog
└── evals/trigger-evals.json          # 20 should/shouldn't-trigger cases
```

**Editing the description?** Re-check it against `evals/trigger-evals.json` — 20 cases,
10 that should fire and 10 that shouldn't. The negatives are the load-bearing half: an
accessibility audit, a Tailwind build failure, a from-scratch landing page, and
"does this *code* look AI-written?" all sit close enough to trip a sloppy description.

**Naming.** Skill names are global, not namespaced by plugin — hence the `ui-` prefix.
Keep it on anything added here.

Originally developed in `~/Code/ai` as `ui-boutique`; renamed on promotion because the
old name pulled toward "fancy/luxurious" and needed a disclaimer paragraph to undo.
