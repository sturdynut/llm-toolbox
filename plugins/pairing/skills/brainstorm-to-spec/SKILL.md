---
name: brainstorm-to-spec
description: >-
  Gated brainstorming interview that turns a rough idea into a written spec.
  Runs five phases — align on what to build, surface and kill assumptions and
  unknowns, define how you'll know it works, identify who it's for, then revisit
  the earlier phases in light of the users — and writes the result to
  .claude/specs/. Use when the user wants to brainstorm, think through, shape,
  scope, or spec a feature or product before building it, says the idea is still
  rough or half-formed, or asks what they're missing. Not for questions with a
  direct answer, design of code already agreed on, or writing a spec from a
  decision that has already been made.
argument-hint: "[what you want to build]"
---

# brainstorm-to-spec

A structured interview that converts a rough idea into a spec someone could build from.

**The output is not agreement — it is a list of things that were wrong before you started
building.** A session where the user confirms everything you propose has failed, however
pleasant it felt. Your job is to find the assumptions that break the design, and you find
them by disagreeing early and cheaply.

Five phases, in this order. Each has a completion criterion; **do not advance until it is
met**, and say which phase you're in when you move.

---

## Phase 1 — Alignment

Converge on one paragraph that both of you would defend, plus the non-goals.

Open with your own reading of the idea, not a question. A proposal the user can correct is
worth five open questions they have to compose answers to:

> Here's what I think you're describing: *[one paragraph]*. What's wrong with that?

Then pin down what it is **not**. Non-goals are cheaper to agree on than goals and they
cut the search space faster. Push for at least three.

**Completion criterion:** the user has confirmed a statement of what you're building — in
their correction, not just a "yeah" — and three or more explicit non-goals are written
down.

## Phase 2 — Assumptions and unknowns

This is the phase that earns the session. Everything else is bookkeeping.

Sort every open item into one of three, because they need different treatment:

- **Assumption** — believed, unverified. *"Users have a stable internet connection."*
- **Unknown** — not believed either way; nobody has the fact. *"How many rows does a
  typical import have?"*
- **Decision** — already settled, and worth recording so it isn't relitigated in phase 5.

Rank by **blast radius**: if this is wrong, how much of the design changes? An assumption
that costs a week to unwind outranks one that costs an afternoon, regardless of how likely
each is to be wrong.

Then work the list in rounds of **three to five items**, highest blast radius first. For
each one, propose the answer you'd bet on and say how confident you are:

> **Assumption (high blast radius):** the import runs synchronously and the user waits.
> I'd bet on this being false above ~5k rows — if so, the whole UI needs a job queue and a
> progress model. Which is it?

Proposing beats asking. It gives the user something to reject in one word, and a wrong
proposal surfaces more than an open question does.

Keep going in rounds until the user says they're satisfied **or** every remaining item is
low blast radius. Before you offer to move on, do one adversarial sweep: what would a
skeptical engineer say breaks this? Name at least one thing you haven't raised yet.

**Completion criterion:** every surfaced item is resolved, or explicitly parked with a note
on what would settle it. Parked is a legitimate outcome; silently dropped is not.

## Phase 3 — How you'll know it works

Before who it's for — because a verification bar you write while thinking about the
mechanism is honest, and one you write after picturing a happy user is marketing.

Get to observable criteria. "It should be fast" is not one; "an import of 10k rows
finishes before the user switches tabs, or tells them it won't" is.

Cover:

- **Acceptance** — what must be true for this to ship at all.
- **Evidence** — what you'd run or look at to check. A test, a query, a manual walkthrough.
- **Failure** — what it looks like when this is broken in production, and who notices.

If a criterion can't be made observable, say so plainly and record it as a judgment call
rather than dressing it up as a metric.

**Completion criterion:** every acceptance criterion has a named way to check it, or is
explicitly marked as a judgment call.

## Phase 4 — Who it's for

Now the users. Be concrete — a role with a job to do, not a demographic.

For each distinct user, establish: what they're trying to accomplish, what they already
know, what they'll do instead if this doesn't exist, and how often they hit this. That last
one reorders more designs than anything else in this phase.

Two users with the same job in different contexts are one user. Two users with different
jobs are two, and if they conflict, say which one wins and write down the trade.

**Completion criterion:** each user has a job, a frequency, and a named alternative they'd
use instead. The primary user is identified when there's more than one.

## Phase 5 — Revisit

Go back through phases 1–3 with the users in hand. This is where the session pays off, so
do it explicitly rather than declaring the earlier phases still valid.

For each of the three, state whether it changed and why:

- Does the **scope** still hold, or did a user's real frequency make a core feature
  optional — or a non-goal mandatory?
- Did any **assumption** just become checkable, or turn out to be about a user who doesn't
  exist?
- Do the **acceptance criteria** match how the primary user would actually judge it?

Finding nothing here is possible but uncommon. If nothing changed, say which user you
checked each item against, so the claim is inspectable.

**Completion criterion:** each of phases 1–3 has been explicitly revisited, with changes
recorded or a stated reason it survived.

## Phase 6 — Capture

Write `.claude/specs/<YYYY-MM-DD>-<slug>/spec.md` using
[references/spec-template.md](references/spec-template.md). Put anything produced along the
way — a schema sketch, an API shape, a state diagram, example payloads — in
`artifacts/` beside it, and link each from the spec.

Two rules for the write-up:

**Record the disagreements.** Where the user overrode your recommendation, write both
positions and whose call it was. That is the most valuable thing in the document six weeks
later, and the first thing a summary drops.

**Keep the parked items.** An open question with a note on what would settle it is worth
more than a spec that reads as if everything was known.

Then report the path, the primary user, and the highest-blast-radius assumption still
unresolved. Don't start building.

---

## Running it well

**One phase at a time, out loud.** Name the phase you're entering. The user should always
know which of the five they're in and what would end it.

**Three to five questions per round.** More than that is a form, and people fill forms in
badly.

**Never ask what you can propose.** "What's the retention policy?" makes the user work.
"I'd assume 90 days, matching the audit log — right?" gets a one-word answer or a
correction that teaches you something.

**Skip what's already settled.** If the conversation before this already established the
users, say so, confirm it in one line, and move on. Re-asking answered questions is the
fastest way to lose someone.

**If the user wants to stop early, stop.** Write the spec from what you have, and mark the
unreached phases as not covered. A partial spec that says so beats a complete-looking one
with invented sections.
