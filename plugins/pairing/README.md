# pairing

Collaboration protocols — how work gets divided between the user and Claude, and what each
side is **forbidden** to touch.

The other domains in this marketplace are about a subject (prose, interfaces, the harness).
This one is about a *working arrangement*. The skills here are mostly constraints: they earn
their keep by what they stop Claude from doing, not by what they let it do.

| Skill | Role |
|---|---|
| `pair-tdd` | Ping-pong pair programming. One party writes the test, the other makes it pass, and neither does both. As implementer Claude never edits the test; as test-writer it scaffolds a to-do list and activates one test at a time, never writing implementation. |

## The shape these skills share

Each one names **two roles, one file boundary, and a handoff**.

- **Roles** are established before any work starts, and restated on every swap.
- **The file boundary is the role boundary** — a glob that says which files are yours this
  turn. It is the enforcement mechanism, not a suggestion.
- **The handoff** ends every turn in a fixed, scannable shape, then stops. Filling the
  silence by starting the other person's work is the failure mode these skills exist to
  prevent.

## Why the constraint is the point

A test written by whoever is about to make it pass isn't independent evidence — it's a
restatement of code that already exists in someone's head. The same collapse happens
whenever one party holds both sides of a check. Splitting the roles is what makes the
check mean anything, which is why `pair-tdd` spends most of its length on *never* rules.

## Triggering

These are opt-in protocols, not defaults. `pair-tdd` fires when someone proposes pairing,
assigns the roles, or asks to swap — **not** on ordinary "add a test for this" requests,
which stay plain test writing. Each skill carries `evals/trigger-evals.json`; re-check the
description against it after any edit, since the negatives are what keep a strict protocol
from hijacking casual work.

## brainstorm-to-spec

`skills/brainstorm-to-spec/`, available to you and to Claude.

A gated interview that turns a rough idea into a spec at `.claude/specs/<date>-<slug>/`,
with any sketches, schemas, or payloads produced along the way in `artifacts/` beside it.

Five phases, each with a completion criterion that has to be met before the next one
starts: align on what's being built (including three or more non-goals), surface and kill
assumptions and unknowns, define how you'll know it works, identify who it's for, then
explicitly revisit the first three in light of the users.

Two things make it a pairing skill rather than a planning one. The user holds the domain
knowledge and Claude holds the process — so Claude proposes and the user corrects, rather
than Claude asking open questions the user has to compose answers to. And the stated
success condition is disagreement: a session where the user confirms everything has failed.
The spec records where Claude's recommendation was overridden, and by whom.

Verification comes *before* users on purpose. A bar written while thinking about the
mechanism is honest; one written after picturing a happy user is marketing.
