# ui-house-style critique taxonomy

The **five categories** and the **scope layers** are the durable spine of this
skill — they stay stable even as specific tells come and go. The tell catalog
below is a snapshot of *today's* generic accent; treat it as illustrative prompts
for your eyes, not a fixed checklist. When a tell here stops being a reliable
signal (because the default aesthetic moved on), the category it lived under is
still the right place to look.

## Contents
- [The five categories](#the-five-categories)
- [Scope layers](#scope-layers)
- [Tell catalog (held loosely)](#tell-catalog-held-loosely)
- [Using the tell catalog without fooling yourself](#using-the-tell-catalog-without-fooling-yourself)
- [Worked finding examples](#worked-finding-examples)

---

## The five categories

Findings must be classified consistently, so keep these boundaries crisp. When a
finding could fit two categories, file it under the one whose *fix* it needs.

### Visual — the styling vocabulary of individual elements
Color, typography, radii, shadows, borders, gradients, iconography, visual
effects, component silhouettes. "What does one button/card/input look like?"

### Structural — how the page establishes meaning and hierarchy
Composition, grouping, alignment, symmetry, information density, layout rhythm,
responsive adaptation, focal points, container/card usage. "How do the pieces
relate, and what does the eye do first?" Often only reliably judged from the
rendered UI, not source.

### Interaction — how the interface behaves over time
Workflow length, navigation, discoverability, keyboard support, state transitions,
feedback, dialogs/modals, progressive disclosure, loading/empty/error behavior,
animation. "What happens when you actually use it, repeatedly?" Usually needs
interactive (browser) inspection for real confidence.

### Content — how the interface speaks
Labels, instructions, empty states, generic marketing claims, gamification, emoji,
tone, terminology, information clarity, unnecessary exposition. "What does it say,
and does it say anything?"

### Model — what the interface believes its subject matter is
The representation underneath the pixels: what is modelled as a live quantity vs. a
frozen string, which values are derived vs. enumerated, whether related numbers
agree, what the sample data implies about intended scope, and whether the entities
the product claims to have (a team, a queue, a deadline) exist as *ideas* or only as
*rows*. "Does this interface know what it is about?"

This is the newest category and the one that catches the most damaging findings,
because model defects are invisible to every visual metric. Four recurring shapes:

- **State where the subject is time.** A support console whose SLA is a hand-authored
  `"breached" | "risk" | "safe"` enum rather than a deadline; no `setInterval`
  anywhere, so "8m ago" stays 8m ago forever while a "Live" badge pulses over it.
  Sorting by such a field can never surface *this one breaches in four minutes*.
- **Enumeration where derivation was needed.** Denormalized values each filled
  plausibly in isolation and never reconciled: a first-response-time field that
  disagrees with its own message timestamps, a donut whose legend sums over one
  population and whose centre label computes over another, `created` and `resolved`
  totals that coincidentally match. The tell is never that one value is implausible —
  it is that no two related values were ever compared.
- **Sample data as an unexamined scoping decision.** If every seeded conversation is
  short, civil, and resolved by a competent agent on the first try, the UI was never
  *forced* to design for the 40-message thread, the duplicate, the misroute, or the
  angry customer — so features like internal notes, merge, and escalate go missing
  *because of the corpus*, not independently of it. Absence of noise is the tell, not
  presence of it. Good prose removes design pressure.
- **Entities present as data, absent as ideas.** A brief says "12-person team"; the
  artifact ships 12 rows in Settings, hardcodes `agents[0]` as "me", and has no
  assignee picker, no "my tickets" filter, and an Escalate button with no target.

### A prior question: who is this optimized for?
Before filing anything, ask whether the artifact is built to be **used** or to be
**witnessed**. Generated UIs are very often a compliance demonstration addressed to
whoever will review them, and this single read explains more defects than any
category does. Evidence it is demo-shaped:

- Debug affordances promoted into production chrome — a `Simulate error` button
  styled as the *primary* action, a `Preview loading state` control beside `New ticket`.
- Manufactured latency (a 380–660ms artificial delay) whose only function is to make
  a spinner visible.
- Internal facts leaking into the interface: a metric card reading `42 seeded tickets`,
  a subtitle printing an internal field name (`sorted by updatedAt`).
- Navigation that is the brief's bullet list transposed into destinations — including
  a singular contextual object (`Ticket`) as a permanent nav peer.
- Stubs given confident success copy rather than being disabled or omitted. A stub
  that says nothing is honest scaffolding; one that toasts "Saved" is a claim.
- A test suite that asserts the brief was satisfied ("at least 40 tickets", "no lorem
  ipsum") while touching nothing that is actually broken — a mirror, not a net.
- Onboarding copy welded permanently into chrome: an affectless explanatory subtitle
  on every panel, correct for a first look and condescending by day three of a surface
  someone occupies 2,000 hours a year.

File the specific instances under the category whose fix they need; state the overall
read in prose. "Every requirement is present; the brief's actual claim is unserved" is
usually the sentence the reader most needs.

---

## Scope layers

`Scope` on each finding names where the change belongs — i.e. where the leverage
is. Ordered from highest leverage to most local:

- **Token** — design tokens / CSS variables. One edit moves the whole app.
- **Primitive** — a base element style (the button, the surface, the input).
- **Component** — a specific shared component.
- **Page** — one screen or route.
- **Workflow** — a multi-step flow across screens.
- **Product-wide** — a systemic pattern; often "originates in a shared primitive"
  even though it shows up everywhere. Name the origin when you can.

---

## Tell catalog (held loosely)

Current-era examples of the generic accent. Presence of several is a smell, not a
verdict — always calibrate against product intent from the Context phase (density
that's "too tight" for a consumer app may be exactly right for an ops console).

### Visual
- One safe palette. **Do not scan for blue.** Measured across three current
  frontier coding agents given an identical brief, *zero* used the blue/indigo/violet
  family; two independently landed on near-identical deep teal (`#0b7a72`, `#0f7b6c`)
  over warm-neutral grounds, and the third on a dark near-black. The safe palette
  moved; "not blue" is no longer evidence of a point of view. Count distinct
  general-purpose accents (>1 is a smell) and ask whether the palette is *derived
  from anything* — the product, the domain, an existing brand — or merely tasteful.
- Signature-clone hexes copied from a famous product (e.g. a Duolingo-red `#ff4b4b`).
- Uniform border-radius across buttons, cards, chips, inputs → everything shares one
  silhouette, so radius stops signaling anything.
- Shadows on every surface; gradients, glassmorphism, blur used for decoration
  rather than genuine elevation.
- Weak type scale — heading levels only 2–4px apart, so hierarchy leans on color or
  heavy bold instead of size/weight/spacing.
- Emoji used as UI icons; or every label paired with a decorative icon that adds no
  information; or a mascot.

### Structural
- Everything wrapped in a rounded card, including passive/explanatory content →
  distinct content types read as interchangeable modules.
- Everything centered; perfect symmetry with no dominant focal point.
- Screenshot-optimized spaciousness — giant padding, tall cards, little information
  per viewport, constant scrolling for routine tasks.
- Missing density modes for power users; layout tuned for a marketing screenshot
  rather than a long work session.
- **Responsive by subtraction.** All three agents in calibration did this, making it the
  most convergent structural tell observed. The only responsive strategy is
  `display: none`, and what it deletes is required functionality: the assignee column
  and SLA clock at ≤1100px; the entire customer-context sidebar at ≤1080px with no
  drawer, tab, or toggle anywhere in the JS to reach it; Settings' own navigation at
  ≤900px. Nothing is relocated, collapsed, or progressively disclosed — it is removed.
  Check what a breakpoint *deletes*, then check whether any affordance exists to get it
  back.
- **Correct-in-isolation primitives composing into a defect.** Worth naming as its own
  class, because it survives code review: each piece is individually right and the
  interaction is wrong. Specimen — a visually-hidden `.vh` label (`position: absolute`)
  used as a grid child in a table header. Absolutely-positioned children occupy no grid
  track, so nine in-flow items spread across ten columns and every header after it
  shifted one column left: `Tags` landed over Channel, `SLA` sat 164px left of its data,
  the last column went unlabeled, and two of the misaligned headers were *sort buttons*,
  so clicking above one column sorted another. An accessibility helper silently broke
  the layout. Look for this wherever a defensive idiom meets a layout primitive.

### Interaction
- A dialog/modal for everything; common actions buried behind extra clicks.
- No keyboard shortcuts / poor focus behavior in a tool used repeatedly.
- Animation on everything, including interactions that should feel instant.
- Hover effects everywhere; missing or generic empty/loading/error states.

### Content
- Placeholder marketing copy: "Manage your workflow effortlessly," "Powerful
  analytics," "Get started today" — polished but says nothing.
- Gamification bolted on regardless of fit (XP, streaks, crowns, badges).
- AI/buzzword filler; generic section headers; unnecessary exposition.
- Placeholder/sample statistics presented as if real.

### Model
- No `setInterval` / `requestAnimationFrame` / `Date.now()` in the render path of a
  product whose subject is elapsed time. Grep for them; absence is the finding.
- A "live" claim the architecture forbids: a `LIVE` eyebrow, a `.pulse` class with no
  `@keyframes`, a refresh button that toasts "Refreshed" without refetching.
- Two numbers describing the same population, rendered on the same screen, that
  disagree. Check every pair you can find — legend vs. centre label, tile vs. chart,
  dashboard average vs. per-row average, counts that sum to different totals. In one
  artifact: nav badge 48 vs. list 58, "breaching" 29 vs. 26, SLA compliance 97.4% vs.
  96.5%, a headline 1,495 against a table summing to 1,359 directly beneath it. **The
  root cause is always the same — no single source of truth for a derived quantity**, so
  every call site re-derives it with its own predicate. Every individual expression is
  correct, which is why no screenshot, linter, or type system catches it. The fix is one
  function, and the finding is Product-wide.
- A control that silently governs only part of its page: a 14-day range selector beside
  panels whose windows are hardcoded to 14 and 90 days, with labels that never change.
- A status/priority enum hand-authored per record instead of derived from a timestamp
  or a rule, so sorting by it conveys no urgency ordering.
- Seed data with no pathological cases: no duplicates, no re-opens, no one-word
  replies, no thread longer than five messages, every record a distinct problem.
- A brief's plural entity ("12-person team", "multiple workspaces") that exists as
  rows but has no operations — nothing to assign *to*, no target to escalate *to*, no
  way to filter to *yours*.
- Latent failures gated purely on data nobody entered yet: a component that renders
  only because the longest current string happens to fit its container.
- A known defensive idiom applied as a reflex nearly everywhere and missing in exactly
  the spot that mattered. The *distribution* of a fix is a map of where attention
  actually went; the omission is usually in the most product-specific, least
  template-shaped part of the design.

### Legibility over the session (not a conformance audit)
This is not a WCAG audit — see the skill's boundary note — but for any surface someone
occupies for hours, legibility *is* a house-style property and it is measurable. Look
for:
- Body and secondary text below 4.5:1, especially when a single muted token carries
  nearly all secondary labels at 10–13px.
- A focus indicator below 3:1 in a product with a hand-rolled keyboard model. Composite
  it against its real backdrop; a translucent outline is usually far worse than it looks.
- The *inversion* worth naming: the "still actionable" state (amber, about-to-breach)
  failing while the "too late" state (red, already breached) passes.
- Sub-10px type, and count the instances.
- Colour as the sole carrier of the one distinction that matters.
- Dark themes are the high-risk case. In measurements across three generated consoles,
  the densest and most visually sophisticated one had **63% of visible text nodes
  failing AA (median 3.99:1)** with section labels at 2.43:1, while the plainest-looking
  had 6%. Visual sophistication and legibility were *anti-correlated*.
- **Diagnose the ink ramp, not the components.** In that artifact all 155 failures fell
  on four ratio values — two tokens on two surfaces. The ramp measured
  16.28 → 7.64 → 4.25 → 2.59 against the background: successive steps of 2.13×, 1.80×,
  1.64×, i.e. constructed for *even perceptual spacing*, an aesthetic criterion, with no
  legibility floor on the bottom rungs. The lowest rung was the single most-used ink
  token in the stylesheet. Report the ramp and the fix is two variables; report the
  components and it looks like 155 problems.
- **Check the light theme before calling it a dark-mode bug.** The same artifact's light
  ramp was 15.44 → 5.79 → 3.38 → 2.24 — same shape, same broken bottom rungs, same 155
  failures on the same nodes. Light mode had been carefully built to match the dark
  ramp's perceptual steps, faithfully porting the defect.
- **Legibility is not a legitimate expression of hierarchy.** Watch for a ramp where
  readability is a monotonic function of importance: one console styled SLA states
  `at_risk` 9.41:1, `breached` 5.96:1, and `met` at **2.43:1**. That is a coherent theory
  of de-emphasis — but "less important" was allowed to reach illegible, and the floor
  below which a human cannot read is not negotiable by design intent. De-emphasise with
  size, weight, position, or space; the contrast floor holds for every rung.
- Composite translucent colours against their *real* ancestor chain before judging. A
  measurement that treats an `rgba()` token as opaque will invent failures — one such
  artifact reported 1.46:1 for an element that was fine.

### The meta-tells (subtle, but strong)
- Token/style files annotated with rationale that argues *against* clichés
  ("never pure grey," "not cartoonish") — reads as a model dutifully countering a
  checklist; real codebases rarely narrate this.
- **Comments that state principles the artifact then violates — and that read as
  evidence a check was performed.** The sharpest specimen: a stylesheet whose header
  declared *"chrome recedes; the ticket list, the thread, and the numbers are the only
  things allowed to be loud,"* shipping with the chrome illegible at 2.43:1 and the
  chart marks the loudest thing on screen — the exact inversion. In the same file, a
  token group commented `/* status — reserved; always shipped with a label */` was
  violated 490 lines later by that app's highest-traffic component, which encoded
  priority as a 3px unlabeled colour chip. These comments are not lies and not
  decoration; they are accurate statements of *intent* by a process with no mechanism
  for holding itself to them. A human who writes down a rule remembers writing it.
  **Treat every such comment as a claim to verify.** In that artifact exactly one —
  `/* validated against --surface-2 */` — was true, and nothing in the prose
  distinguished it from the ones that weren't.
- **Accessibility present in exactly the shape it exists as a memorizable snippet.**
  The canonical `prefers-reduced-motion` one-liner appears verbatim; `prefers-contrast`
  and `forced-colors` — which require per-token reasoning — appear zero times. In the
  one artifact where contrast *was* the defining defect, the single query that would
  have mitigated it was the one absent. Presence of the famous snippet is not evidence
  of accessibility work.
- **A data model consistently richer than its presentation.** Seed data carrying a
  `dateLabel` field ("6/25") while the chart renders `label` ("Thu"), producing an axis
  of repeating weekday names across two weeks; per-priority SLA targets modelled and
  then rendered as an unlabeled 3px chip; customer titles and timezones modelled and
  then `display: none`d. Reads as generation order: the world was built first with
  care, and the views were then generated against a *remembered* schema rather than the
  actual one.
- Suspiciously tidy completeness: full token layering, dark mode, reduced-motion,
  a perfect taxonomy, zero dead tokens or one-off overrides. Human codebases
  accrete inconsistency.
- Escaping one era's accent by landing squarely on the current one (candy → sage).
  Absence of *old* tells is not presence of a voice.
- **Unrequested deliverables.** The artifact ships a test harness, a docs file, or a
  smoke-test page nobody asked for. Two of three agents did this unprompted on the same
  brief. It reads as thoroughness and functions as a tell.
- **Craft aimed at the wrong risks.** Rigorous `escapeHtml` at every interpolation in a
  `file://` demo whose customer-context panel does not render at all. The care is real
  and pointed at hazards the artifact doesn't have.

---

## Using the tell catalog without fooling yourself

The catalog invites you to grep. Grepping it misfires badly — in one calibration pass
every single lexical hit was a false positive:

| Apparent tell | Actually |
|---|---|
| `lorem ipsum` in the source | the artifact's own test asserting there is *no* lorem ipsum |
| gamification (`badge`) | a `.badge` CSS class for status pills |
| marketing filler (`elevate`) | `"seeing elevated APNs latency"` in a ticket body — correct domain prose |

Rules that follow:

1. **Never report a lexical hit you have not read in context.** Class names, test
   assertions, code comments, and legitimate domain vocabulary all collide with the tells.
2. **Prefer computed styles to source greps** for anything visual. Source says
   `var(--radius)`; computed says `4px × 64, 999px × 88` — only the second tells you
   whether radius still signals control role.
3. **Measurable visual metrics passing is not evidence of a point of view.** A UI can
   post 4 distinct radii, 1 shadow token, 8 background colours, and a disciplined type
   scale — genuinely good numbers — and still be generic, because the sin is not
   inconsistency. Ask instead: **does any element's size argue for itself?** Generated
   layout is `repeat(N, minmax(0,1fr))` with N a round number and content poured in
   afterward; the giveaway is dead whitespace where a short list got the same width as
   a long one. No automated check catches "the layout expresses no opinion."

## Worked finding examples

**Structural, product-wide:**
```
Category:            Structural
Finding:             Containers are doing most of the hierarchy work.
Evidence:            12 of 15 major page regions use the same bordered, rounded
                     surface — filters, passive descriptions, summary metrics, and
                     tables all get identical treatment (rendered desktop + mobile).
Why it matters:      Distinct information types appear equally important, so the
                     page fragments into visually interchangeable modules and the
                     eye has no focal point.
Suggested direction: Remove containers from passive sections; build hierarchy from
                     typography, alignment, spacing, and section boundaries. Reserve
                     bordered surfaces for independently interactive or elevated
                     content.
Confidence:          High — confirmed in rendered desktop and mobile views.
Scope:               Product-wide, originating in the shared section primitive.
```

**Visual, token:**
```
Category:            Visual
Finding:             Radius is uniform across every interactive element.
Evidence:            Buttons, cards, chips, and inputs all resolve to 16px
                     (single --radius token used everywhere).
Why it matters:      Radius no longer distinguishes control types; everything shares
                     one silhouette, flattening the visual language.
Suggested direction: Introduce a small radius scale tied to element role (tighter
                     for inputs/buttons, softer for panels); reserve full-round for
                     pills/avatars only.
Confidence:          High — read directly from tokens and computed styles.
Scope:               Token.
```

**Model, product-wide** — the shape most likely to be the highest-leverage finding:
```
Category:            Model
Finding:             The product models SLA as a state enum when its subject is time.
Evidence:            `sla: "breached" | "risk" | "safe"` is hand-authored per ticket in
                     the seed data; no setInterval, requestAnimationFrame, or Date.now()
                     appears in 862 lines of app logic. "16m ago" never advances. The
                     queue's "SLA risk: 16" tile adds urgent(8) + breached(8) — the same
                     8 tickets counted twice; the Performance view says 11 and 8. A
                     donut legend sums over 42 tickets while its centre label computes
                     over 39, printing "79%" inside a 55% arc.
Why it matters:      Sorting by SLA cannot surface "this one breaches in four minutes,"
                     which is the entire job. The three contradictory at-risk numbers
                     are all downstream of the same missing clock, and a shift lead
                     staffs against a figure inflated 2x.
Suggested direction: Replace the enum with a real deadline timestamp per ticket, tick it
                     on an interval, and derive sort order, row treatment, the summary
                     tile, and the health pill from that single source. Density,
                     differentiation, and the "Live" claim all become true for free.
Confidence:          High — absence of timers confirmed by grep; arithmetic verified
                     against rendered views.
Scope:               Product-wide, originating in the data model.
```

**Content, component:**
```
Category:            Content
Finding:             Empty and hero states use generic marketing filler.
Evidence:            Dashboard empty state reads "Manage your workflow
                     effortlessly"; three section headers are buzzword phrases with
                     no product-specific nouns.
Why it matters:      The copy signals nothing about what the user can do here and
                     reads as template output, undercutting trust.
Suggested direction: Replace with concrete, product-specific guidance naming the
                     actual next action and object ("No campaigns yet — create one
                     to start tracking spend").
Confidence:          Medium — clear from source; final wording benefits from a
                     rendered pass in context.
Scope:               Component (shared empty-state), with page-level copy edits.
```
