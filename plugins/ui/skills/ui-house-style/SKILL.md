---
name: ui-house-style
description: >-
  Context-aware UI critique and transformation. Inspects a UI's source and — when
  it can reach the running app — its rendered experience, identifies generic
  visual, structural, interaction, content, and information-model patterns (the "AI
  accent" that makes interfaces feel machine-generated), defines a house style tailored to what
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
judgment is calibrated against — plus two specifics that Inspect and Critique both
depend on:

- **Session shape.** Minutes at a time, or hours? A surface occupied for a full shift
  makes legibility, motion, density, and recoverability load-bearing rather than nice
  to have. "Used all day" is a design constraint, not flavour text.
- **Device reality.** What do these people actually work on, and at what window size?
  Infer it from the domain (internal ops tooling means docked laptops; a consumer
  utility means phones) and carry it into your viewport choice. Getting this wrong is
  how a review passes a UI that is broken at the only width that matters.

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
anything satisfying the contract qualifies. A ~120-line Chrome DevTools Protocol
driver over a raw WebSocket satisfies it with zero dependencies, and headless Chrome's
`--screenshot` flag alone covers the static case.

**Derive the breakpoints from the product's real device profile, not from
desktop/tablet/mobile habit.** This is the single most common inspection miss: an
internal console used all shift lives at 1280–1440 and almost never at 390, so the band
that must be checked hardest is the one nobody checks. In calibration one console
rendered acceptably at 1440 and broke badly at 1180 — a button clipped to `Cle`, every
filter `<select>` truncated, the conversation column collapsed to about four words per
line — and that band contains 1280×800 and 1366×768. Mobile, nearly irrelevant to the
product, got the tidiest treatment.

State your viewports and *why* in the manifest. "1440 / 1180 / 390 because agents work
on 13-inch laptops docked to one display" is calibration; "desktop / tablet / mobile" is
habit.

**Run a legibility pass while you have computed styles.** Not a WCAG audit — see the
boundary note below — but for a surface someone occupies for hours: sample the visible
text nodes, composite each colour against its real ancestor chain, and report the share
failing 4.5:1 plus the worst offenders. A few lines of in-page JS turns "feels murky"
into `63% of visible text fails AA, median 3.99:1, column headers at 2.43:1`. Diagnose
the *token ramp* rather than the components, and check the other theme before calling it
a dark-mode bug.

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
- **Model** (source, and cheap): grep for `setInterval` / `Date.now()` in the render
  path; cross-check every pair of numbers that describe the same population; read the
  sample data for pathological cases that are *missing*; check whether the brief's
  plural entities have operations or only rows. High-yield, low-effort, and usually
  where the highest-leverage finding lives.

#### Look where a screenshot can't

The defect distribution in generated UIs tracks one variable almost perfectly: **whether
a flaw is visible without operating the software.** What shows in a still frame tends to
be good; what needs five minutes of use tends to be broken — scroll position and focus
destroyed on every selection, stale selections that bulk actions then apply to invisible
records, `Esc` wiping a draft with no undo, a date-range control that silently governs
half its page.

Density is a token-level decision that photographs beautifully; not-losing-your-place is
a state-management decision invisible in any screenshot. Generated UIs reliably ship the
first and not the second. So spend your rendered budget on *sequences*, not stills:

1. Scroll down, act, and check whether you are still where you were (`scrollTop`,
   `document.activeElement`).
2. Type in a composer, navigate away, come back — is the draft alive?
3. Select records, change the filter, then act — what did you just act on?
4. Do the core loop twice. Resolve → next. Most generated queues never remove the thing
   you resolved, because nobody did it twice.

**Verify your own captures, too.** A flag-based headless screenshot can silently yield a
partially-composited frame — in this calibration one arm's PNGs came out uniformly dimmed
into value range 12–75 of 255, which made a dark theme look far worse than it was and
confounded cross-UI visual comparison. Check the pixel range of a capture before
reasoning from it, prefer CDP `Page.captureScreenshot` with `fromSurface: true`, and put
colour claims on computed styles rather than on pixels.

#### Distrust the artifact's own claims

Treat the thing's self-report as a claim to verify, never as evidence. In calibration one
agent advertised keyboard navigation its own render strategy broke, and another shipped a
22-assertion suite reporting **all green** over a product whose primary metric was
sign-inverted — because the suite asserted the brief ("at least 40 tickets", "no lorem
ipsum") and never touched the render layer. A passing test suite, a confident README, and
a feature list are artifacts to inspect, not findings to repeat. The same goes for
rationale comments in the source: they state intent, not verification.

#### The accessibility boundary

This skill does **not** do WCAG conformance audits — if that is the ask, say so and
scope it separately. But do not use that boundary to skip legibility: contrast, focus
visibility, and type size on a surface someone occupies for eight hours are house-style
properties, and they show up as `Interaction` or `Visual` findings on their own merits.
A 1.5:1 focus ring in a product with a hand-rolled keyboard model is not a compliance
technicality; it means the keyboard model does not work. Report those. Leave
screen-reader conformance, WCAG success-criterion numbering, and legal-threshold
questions to an actual audit.

Keep an **inspection manifest** as you go — routes/URLs opened, viewports used,
states reached, workflows walked, screenshots captured, source areas analyzed. You
will re-run this exact manifest to verify changes, so record it now.

This phase is empirical only. No refactoring yet.

---

### 3. Critique — findings, accent read, house style, change strategy

Produce four deliverables.

**(a) Findings**, grouped into the five categories (**Visual, Structural,
Interaction, Content, Model** — defined in `references/critique-taxonomy.md`).

Before filing any of them, answer the prior question the reference opens with:
**is this optimized to be used, or to be witnessed?** Debug controls promoted into
production chrome, manufactured latency so a spinner is visible, internal facts
leaking into copy (`42 seeded tickets`), navigation that is the brief's bullet list
transposed, stubs that toast success — these cluster, and the cluster explains more
than any single finding. When it's present, say so in prose before the table; the
sentence a reader usually needs is *"every requirement is present; the brief's
actual claim is unserved."*

Each finding uses this structure, because a bare "too many cards" is unactionable and
an evidence-backed direction is what a designer can actually use:

```
Category:           Visual | Structural | Interaction | Content | Model
Finding:            The defect, stated once.
Evidence:           Concrete, measured, sourced (counts, values, which views).
Why it matters:     The design consequence — what it costs the user/product.
Suggested direction: An opinionated direction, not a mechanical find-replace.
Confidence:         High | Medium | Low — grounded in the evidence you actually have.
Scope:              Token | Primitive | Component | Page | Workflow | Product-wide.
```

`Scope` names the layer to change, which is where the leverage is — a token-level
fix moves the whole app; a page-level fix moves one screen. `Confidence` must track
your real evidence — but calibrate, don't reflexively downgrade:

- **Structural** findings from source alone are usually Low. Whether the page has a
  focal point is genuinely not readable from CSS.
- **Interaction** findings are the exception people get wrong. Reading the *render
  strategy* yields High confidence from source alone: an `innerHTML` rebuild on every
  mutation destroys focus, resets the scroll container, and wipes the composer draft.
  That is catastrophic, source-provable, and needs no browser. Do not hedge it.
- **Model** findings are near-always High from source, because the evidence is
  arithmetic and absence — two totals that disagree, no timer in the render path.

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
| Model       | Dominant                | High       |

Bands: **Minimal · Mild · Moderate · Strong · Dominant · Insufficient evidence.**

**A low Visual band is not a clean bill of health, and you must not let it read as
one.** In calibration, two of three generated consoles posted genuinely good visual
numbers — 4 distinct radii, one shadow token, restrained palettes, disciplined type
scales — while being unusable for the job they claimed. If Visual comes out
Mild/Minimal and Model or Structural comes out Strong, say that inversion out loud;
otherwise a reader scans the first row and stops. The bands are five independent
readings, not five contributions to an average.
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
- **At least one checkable floor** — the highest-leverage requirement here. State at
  least one rule a machine can verify and a human can run: a contrast minimum for each
  ink rung *against the surfaces it actually appears on*, a minimum row count in the
  fold, a largest-allowed type size, a focus-ring ratio. Write it next to the rationale
  and say how to check it. Prose philosophy is necessary and insufficient — it is
  precisely the part that fails. In a controlled comparison inside one generated
  stylesheet, the one colour layer carrying a floor and a validator passed; the layer
  left to taste accounted for every contrast failure in the file. A checkable threshold
  predicted correctness better than the model, the prompt, or the taste on display.
  See `references/calibration-log.md`.
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
| Model       | Dominant | Mild   | High       |

Explain *why* each band moved (which findings were addressed) — don't just assert
improvement. Report remaining findings, any regressions, and the intentional
exceptions you preserved. Verify against the house style, not merely that the code
compiles. A before/after beauty contest proves nothing; a repeated manifest does.

---

## Reference

`references/calibration-log.md` — empirical runs behind the guidance above: what three
coding agents actually produced from one identical brief, the measurements, and which of
this skill's own claims turned out to be wrong. **Append to it** when you learn something
durable; the tells in the taxonomy age, and this is the record that lets a future run tell
a pattern from a one-off.

`references/critique-taxonomy.md` — precise definitions of the five categories
(so findings don't drift between them), the "used or witnessed?" prior question, the
`Scope` layers, a catalog of common generic-accent tells per category (current
examples, held loosely — the categories are the durable part), a section on using
that catalog without fooling yourself, and worked finding examples. Read it when
classifying findings or when you want a checklist of what to look for during Inspect.
