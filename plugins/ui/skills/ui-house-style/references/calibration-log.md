# Calibration log

Empirical runs that shaped this skill. **Append, don't rewrite** — the point is a record of
what was actually observed, so a future run can tell a durable pattern from a one-off. Each
entry: method, what held up, what the skill got wrong, what changed as a result.

---

## 2026-07-26 — three coding agents, one identical brief

### Method

Three CLI coding agents were each given a byte-identical prompt in an isolated directory and
told to build "Relay", a support-ticket triage console for "a 12-person support team who live
in it for their entire shift." Plain HTML/CSS/JS, no build step, no CDN, `file://`-safe, ≥40
seeded tickets. Nothing about visual style was specified. The intent sentence was deliberate:
it tests whether generators respect an explicit density signal.

| arm | version | wall clock | output | notes |
|---|---|---|---|---|
| cursor-agent | 2026.07.23 | 6m36s | 3,750 lines / 7 files | added `tests.html` + `docs/` unprompted |
| codex | 0.145.0 | ~10m | 2,206 lines / 3 files | avoided modals entirely |
| claude | 2.1.220 | 60m, `is_error` at 50 turns, $13.20 | ~370k / 9 files | auto-invoked its bundled `dataviz` skill; built its own `_smoke.html` to self-verify |

Inspection: a dependency-free CDP driver over Node's global WebSocket for clicks, three
viewports, computed styles, and a text-contrast audit; plus a source-measurement script. Then
one cold reviewer per artifact, given **no** framework and explicitly not shown this skill, so
their findings could be diffed against what the taxonomy produced. My own taxonomy pass was
written and sealed *before* reading any cold review.

Two methodology errors worth recording, both mine:

- **Flag-based headless screenshots were silently dimmed.** Every pixel in the `--screenshot`
  PNGs landed in value range 12–75 of 255 — a partially-composited frame, an affine dim at
  α≈0.065. It made the dark-themed arm look far worse than it was and confounded cross-arm
  *visual* comparison. Computed-style numbers were unaffected. Prefer CDP
  `Page.captureScreenshot` with `fromSurface: true`, and check a capture's pixel range before
  reasoning from it.
- **Lexical tells produced 3 hits, all false positives** (see the taxonomy's "Using the tell
  catalog without fooling yourself").

### Headline result: the checkable-threshold effect

The claude arm gives an internal controlled comparison inside a single file, same session,
same model:

| layer | had a floor + validator? | measured |
|---|---|---|
| 5 chart-series colours | **yes** — source comment `/* validated against --surface-2 for dark */` | 4.38–5.62:1, all pass |
| 4 ink tokens | no comment, no floor | 155/155 text failures trace to 2 of them; they carry 58% of ink usage |

Its bundled `dataviz` skill supplied a numeric floor and a runnable validator; that layer came
out correct. Everything left to taste failed. **The presence of a checkable threshold predicted
correctness better than the model, the prompt, or the evident taste.** This is why the house
style deliverable now requires at least one checkable floor rather than prose alone.

Corollary: a skill produces a local optimum at its own boundary. The charts were vivid and
validated *inside* an interface whose text was illegible. Skill scope becomes quality scope.

### Contrast, measured

| arm | visible text nodes failing AA | median ratio |
|---|---|---|
| claude (dark) | 63% | 3.99:1 |
| claude (light theme, same nodes) | 64% | 3.93:1 |
| cursor | 23.8% | 5.59:1 |
| codex | 6.1% | 5.13:1 |

The most visually sophisticated arm had by far the worst legibility. Its light theme had been
carefully built to match the dark ramp's perceptual steps and faithfully ported the defect —
so this was a token-level aesthetic decision, not a dark-mode oversight.

### Density vs. intent

All three were told the tool is occupied for a full shift.

| arm | rows in a 900px fold | median row height | card-like elements (queue) |
|---|---|---|---|
| claude | 19 (24 in compact mode) | 40px | 1 |
| cursor | 12 | 63px | 2 |
| codex | ~5 | 98px | 13 |

Only one arm shipped a density control. Notably, the arm with the best density was also the one
whose *state management* was worst — selecting a row reset the scroll container to 0 and dropped
focus to `<body>`. Density is a token-level decision that photographs well; not-losing-your-place
is a state-management decision invisible in a screenshot. That asymmetry became the "Look where a
screenshot can't" section.

### What the palette tell got wrong

Zero of three used blue/indigo/violet. Two independently landed on near-identical deep teal
(`#0b7a72`, `#0f7b6c`) over warm-neutral grounds; the third on a dark near-black. Scanning for
blue would have returned "not generic" on three highly generic artifacts.

### Convergent findings across independent reviewers

These appeared in **two or three** cold reviews of **different** artifacts, which is why they
became categories or first-class tells rather than trivia:

1. **Optimized to be witnessed, not used.** A `Simulate error` button styled as the *primary*
   action; a `Preview loading state` control beside `New ticket`; 380–660ms of manufactured
   latency so a spinner is visible; `42 seeded tickets` shipped as a metric card; navigation
   that is the brief's bullet list transposed. Both reviewers led with this.
2. **State modelled where the subject is time.** No `setInterval` / `Date.now()` in either of
   two arms' render paths; SLA as a hand-authored enum; a `.pulse` class with no keyframes
   beside a `LIVE` badge. Both reviewers independently named fixing this the
   highest-leverage change.
3. **Seed data as an unexamined scoping decision.** Uniformly short, civil, first-try-resolved
   threads meant the UI was never forced to design for duplicates, re-opens, long threads, or
   angry customers — so internal notes, merge, and escalate went missing *because of* the
   corpus.
4. **Enumeration where derivation was needed.** Every arm shipped mutually contradictory
   numbers on one screen, always from re-deriving a quantity at each call site.
5. **Responsive by subtraction.** 3/3 arms. `display: none` deleting required functionality
   with no affordance to retrieve it.
6. **Unrequested deliverables.** 2/3 arms shipped test harnesses or docs nobody asked for.

### What held up

- The four original categories worked as *filing* boundaries — every finding could be placed.
- Scope layers correctly located leverage every time.
- Intent-relative judgment was right: both reviewers organised their most damaging section
  around "does this serve an all-shift operator," which is this skill's Context phase.
- Refusing a numeric score was right — all three would have scored well.

### Changes made as a result

Added the **Model** category and the "used or witnessed?" prior question; the checkable-floor
requirement in the house style; "Look where a screenshot can't" and capture verification;
breakpoints derived from the device profile; the legibility pass and the accessibility boundary
note; confidence calibration (interaction findings from render strategy are High, not Low);
the bands caveat that a low Visual band is not a clean bill of health; the tell-catalog
false-positive rules; and new tell classes — responsive-by-subtraction,
correct-in-isolation-primitives-composing-into-a-defect, comments-as-unverified-claims,
accessibility-as-memorizable-snippet, data-model-richer-than-presentation. Plus 4 trigger-eval
cases (2 positive, 2 negative).
