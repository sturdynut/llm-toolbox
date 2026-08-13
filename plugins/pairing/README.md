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
