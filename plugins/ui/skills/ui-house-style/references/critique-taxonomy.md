# ui-house-style critique taxonomy

The **four categories** and the **scope layers** are the durable spine of this
skill — they stay stable even as specific tells come and go. The tell catalog
below is a snapshot of *today's* generic accent; treat it as illustrative prompts
for your eyes, not a fixed checklist. When a tell here stops being a reliable
signal (because the default aesthetic moved on), the category it lived under is
still the right place to look.

## Contents
- [The four categories](#the-four-categories)
- [Scope layers](#scope-layers)
- [Tell catalog (held loosely)](#tell-catalog-held-loosely)
- [Worked finding examples](#worked-finding-examples)

---

## The four categories

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
- One safe palette: blue/indigo/violet/teal — *or* the newer calm-sage/warm-neutral
  register. Either can be a default; count distinct accents (>1 general-purpose
  accent is a smell).
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

### The meta-tells (subtle, but strong)
- Token/style files annotated with rationale that argues *against* clichés
  ("never pure grey," "not cartoonish") — reads as a model dutifully countering a
  checklist; real codebases rarely narrate this.
- Suspiciously tidy completeness: full token layering, dark mode, reduced-motion,
  a perfect taxonomy, zero dead tokens or one-off overrides. Human codebases
  accrete inconsistency.
- Escaping one era's accent by landing squarely on the current one (candy → sage).
  Absence of *old* tells is not presence of a voice.

---

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
