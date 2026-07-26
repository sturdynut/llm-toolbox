---
name: ui-house-style
description: >-
  Context-aware UI critique and transformation. Inspects a UI's source and — when
  it can reach the running app — its rendered experience, identifies generic
  visual, structural, interaction, and content patterns (the "AI accent" that
  makes interfaces feel machine-generated), defines a house style tailored to what
  the product is trying to be, and optionally implements and verifies the changes.
  Use this whenever someone asks to review a UI's design, asks whether an interface
  "looks AI-generated" or generic, wants to "de-slop" or add personality/polish to
  a frontend, wants a design critique or house style, or wants a UI made more
  distinctive, denser, or more workflow-first — even if they don't say "critique"
  or "house style." Prefer this over an ad-hoc design opinion whenever a real UI (a
  repo, a URL, or screenshots) is in play.
---

# ui-house-style

## What a house style is here

A house style is **bespoke and fit-to-purpose** — the opposite of mass-produced,
default-generated UI. A dense ads-operations console and a calm reading app each
have one when they're tailored to how they're actually used; neither is more
"styled" than the other. Your job is to give a UI a *distinct point of view*, not
to make it prettier, fancier, or more ornamental.

Two pulls the name itself creates, worth naming up front: a house style is **not a
token table** — see deliverable (c) — and it is **not automatically a document**.
Sometimes the useful output is a two-paragraph verdict, sometimes it's the changed
code. Match the register to the ask (below), not to the word "style."

The core idea: most generated UIs aren't ugly — they all speak in the same
**accent**. Blue/indigo palettes, everything in a rounded card, emoji on every
label, gamified copy, uniform radius, shadows everywhere, spacious-for-screenshots
layouts. The accent shifts over time (yesterday's candy-Duolingo look, today's
calm-sage look) but the *phenomenon* — an interface that sounds like every other
model's output — is durable. You find where a UI speaks in that generic accent and
help it develop its own voice.

## The loop: Context → Inspect → Critique → Change

Four phases. The first three always run; **Change is opt-in** (see below). Each
phase has explicit outputs, but don't turn them into ceremony — no approval gate
between every step.

### Right-size the response to the ask

The full four-deliverable Critique is the *ceiling*, not a fixed toll. Match the
depth to what the person actually wants, because a one-line "does this look
generated?" drowned in a full house-style document is its own kind of bad output.
Read the request and pick a register:

- **Quick read** ("does this look AI-generated?", "is this generic?") → still run
  Context and Inspect (you can't answer honestly without looking), but reply with
  the **generic-accent band table + a short prose verdict and the 2–3 findings that
  drive it.** Offer to go deeper. Don't auto-generate a house style nobody asked for.
- **Full critique** ("review this UI", "de-slop this", "give it a point of view")
  → the complete Critique: all findings, bands, house style, change strategy.
- **Change requested** ("fix it", "make it denser") → full critique *then* the opt-in
  Change phase.

When unsure which register fits, do the quick read first and ask before expanding.
Depth should track the question, not default to maximum.

---

### 1. Context — understand what the product is trying to be *before* judging it

A spacious meditation app and a dense trading terminal must not be judged against
the same targets. Density, ornament, playfulness, and information-per-screen are
only "wrong" relative to intent.

**Infer before asking.** Read what's already there: README and product docs,
route/page names, visible product copy, existing design-system or token guidance,
component and token structure, and the domain itself (is this consumer,
operational, creative, internal-tooling, or developer-facing?). Most of what you
need is already in the repo.

**Then ask at most one or two questions** — only for what you genuinely can't
infer. The two that usually matter:
- "Do you have a local or deployed URL I can open, so I can review the rendered
  UI and not just the code?"
- (only when intent is truly unclear) "Is this for occasional consumer use, or
  repeated power-user workflows?"

Do not make the user fill out a product brief before you can start. Output of this
phase: a short statement of what the product is and who uses it, which every later
judgment is calibrated against.

---

### 2. Inspect — gather evidence from the strongest available surface

Two independent capabilities decide how much you can see. **Keep them separate** —
conflating them is the most common reasoning error here:

- **Agent browser capability** — can *you*, right now, open a URL, drive a browser,
  and capture screenshots + computed styles? This may be available even when the
  repo contains no browser tooling at all.
- **Repository browser capability** — does the *repo* ship Playwright, Cypress,
  Puppeteer, WebdriverIO, Storybook, Vitest browser mode, etc.?

> Do not conclude that rendered inspection is impossible just because the repo has
> no Playwright/browser-test dependency. Check whether you can drive a browser
> independently first.

And crucially: **mode is decided by demonstrated access, not tool presence.** A
browser driver that can't reach `localhost`, an authenticated/VPN-only deploy, or
an app that won't start without missing services means you fall back — regardless
of what tools exist. Say so explicitly, e.g.:

> "Browser capability is available, but the supplied local URL was unreachable
> from here. Continuing in source-only mode unless you can share screenshots or an
> accessible URL."

#### The browser capability contract

Rendered inspection needs *something* that can: load a URL (or mount a component),
set viewport width at **≥3 representative breakpoints**, capture screenshots, read
the DOM + computed styles, drive focus/keyboard/hover/pointer, reach meaningful
non-default states (empty, loading, error, open menu/dialog), and walk important
workflows. Playwright is the reference implementation, **not a hard dependency** —
anything satisfying the contract qualifies.

**Resolution order** (prefer lowest friction that gives real rendered evidence):
1. An **agent-accessible browser driver** (e.g. a Playwright MCP server or a
   built-in browser tool) — no repo changes.
2. **User-provided screenshots** → render-assisted mode.
3. The repo's **existing harness**, *only when it's genuinely low-friction* to
   drive ad-hoc (reusing a test harness usually means authoring throwaway spec
   files — often more work than driving a browser directly).
4. **Offer to install Playwright** — with permission. You may *inspect*
   dependencies freely, but **never install or change dependencies automatically.**
5. **Source-only** — the explicit final fallback.

This yields three evidence modes, in descending confidence: **Interactive
browser → Render-assisted → Source-only.**

#### What each surface reveals

- **Source** (always): tokens/globals, type scale, radius/border/shadow
  distribution, palette proliferation, component architecture and duplication,
  copy, iconography, animation definitions, accessibility implementation.
- **Rendered** (needs access): actual visual hierarchy, whether everything reads
  as a card, real viewport density, responsive behavior, clipping/overflow, focus
  and keyboard behavior, modal proliferation, interaction/click count, whether the
  prominent actions are *actually* prominent.

Keep an **inspection manifest** as you go — routes/URLs opened, viewports used,
states reached, workflows walked, screenshots captured, source areas analyzed. You
will re-run this exact manifest to verify changes, so record it now.

This phase is empirical only. No refactoring yet.

---

### 3. Critique — findings, accent read, house style, change strategy

Produce four deliverables.

**(a) Findings**, grouped into the four categories (**Visual, Structural,
Interaction, Content** — defined in `references/critique-taxonomy.md`). Each finding
uses this structure, because a bare "too many cards" is unactionable and an
evidence-backed direction is what a designer can actually use:

```
Category:           Visual | Structural | Interaction | Content
Finding:            The defect, stated once.
Evidence:           Concrete, measured, sourced (counts, values, which views).
Why it matters:     The design consequence — what it costs the user/product.
Suggested direction: An opinionated direction, not a mechanical find-replace.
Confidence:         High | Medium | Low — grounded in the evidence you actually have.
Scope:              Token | Primitive | Component | Page | Workflow | Product-wide.
```

`Scope` names the layer to change, which is where the leverage is — a token-level
fix moves the whole app; a page-level fix moves one screen. `Confidence` must track
your real evidence: structural/interaction findings from source-only inspection are
usually Low, and should say so rather than bluffing.

**(b) Generic-accent read** — qualitative bands, never a fake-precise number like
`17/25`. A score invites optimizing toward the mean, and "distinctive" is partly
about *deviation*; a conformity score would reward the blandest UI. Report presence
of generic patterns, per category, with confidence:

| Category    | Generic accent presence | Confidence |
| ----------- | ----------------------- | ---------- |
| Visual      | Strong                  | High       |
| Structural  | Moderate                | High       |
| Interaction | Insufficient evidence   | Low        |
| Content     | Mild                    | Medium     |

Bands: **Minimal · Mild · Moderate · Strong · Dominant · Insufficient evidence.**
State the axis explicitly in your output: *these bands estimate the prevalence of
generic, template-driven, machine-associated patterns. They do not measure visual
quality, usability, accessibility, originality, or whether the UI is "good."* Call
the column **Generic accent presence**, not just "Accent" — bare "accent" reads as
"distinctive personality," which reverses the meaning.

**(c) House style** — a decision-making *philosophy*, not a token table. A design
system says "cards use 8px radius"; a house style says *why* and *when*. It should
read like a point of view a team could apply to a new screen you never mentioned.
Cover: personality, density, hierarchy strategy, typography behavior, surface
treatment (borders/backgrounds/shadows), color behavior, iconography, motion,
content voice, interaction principles — plus:

- **At least one signature move** — one recognizable, *relevant* thing that makes
  the product ownable. It can be a layout behavior, an information model, a
  transition, a navigation pattern, a distinctive content or data-viz treatment, or
  a compact control pattern. It must be recognizable and fit the product — **do not
  force novelty, quirkiness, asymmetry, or deliberate imperfection** (a "wrong on
  purpose" rule just becomes a new formula/tell). If the product already has a
  genuine signature, **preserve and strengthen it** rather than inventing a new
  gimmick. Do not default to "add an unusual color, illustration, or flourish."
- **Intentional exceptions** — deliberate deviations from the defaults, recorded so
  a future run (or a future you) doesn't "fix" them. E.g. *"Persistent surfaces are
  flat; the campaign preview keeps elevation because it's a movable object above the
  workspace."* Without this, the skill re-slops its own prior signature choices.
- **Anti-patterns** — what this product should specifically avoid.

**(d) Change strategy** — a prioritized map of *where* changes should land (tokens
→ primitives → components → pages → workflows → content), separating high-confidence
corrections from subjective stylistic calls from potentially breaking interaction
changes. This prevents random file-by-file edits without being a ceremonial "plan"
gate.

---

### 4. Change — opt-in implementation, symmetrically verified

**Respect intent.** Distinguish *review* from *proposal* from *implementation*.
"Does this look AI-generated?" is a review — do **not** silently refactor. "De-slop
this UI" may include implementation, but state the intended scope before making
broad changes. When unsure whether the user wants edits, stop after Critique and
ask.

When implementing:
1. Preserve an evidence baseline (screenshots + the inspection manifest).
2. Change **tokens and primitives first** — that's where a single edit moves the
   whole surface (this is the token-first leverage `Scope` pointed at).
3. Update shared components next.
4. Then page- and workflow-level changes, then copy/interaction.
5. Do the signature work last.
6. Remove local one-off workarounds the systemic fix makes redundant.

**Verify symmetrically.** Re-run the *same inspection manifest* — same routes, same
viewports, same states, same workflows, same screenshot framing where practical —
not a new looser check. Then show a before/after that earns its claims:

| Category    | Before   | After  | Confidence |
| ----------- | -------- | ------ | ---------- |
| Visual      | Strong   | Mild   | High       |
| Structural  | Moderate | Mild   | High       |
| Interaction | Strong   | Moderate | Medium   |
| Content     | Mild     | Minimal| High       |

Explain *why* each band moved (which findings were addressed) — don't just assert
improvement. Report remaining findings, any regressions, and the intentional
exceptions you preserved. Verify against the house style, not merely that the code
compiles. A before/after beauty contest proves nothing; a repeated manifest does.

---

## Reference

`references/critique-taxonomy.md` — precise definitions of the four categories
(so findings don't drift between them), the `Scope` layers, a catalog of common
generic-accent tells per category (current examples, held loosely — the categories
are the durable part), and worked finding examples. Read it when classifying
findings or when you want a checklist of what to look for during Inspect.
