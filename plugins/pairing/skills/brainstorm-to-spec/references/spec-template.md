# Spec template

Written at `.claude/specs/<YYYY-MM-DD>-<slug>/spec.md`. Delete any heading you have nothing
real for — an empty section is honest, an invented one is a trap.

```markdown
# <What we're building>

**Date:** <YYYY-MM-DD> · **Primary user:** <role> · **Status:** draft

## What this is

<The paragraph from phase 1, in the form both parties confirmed.>

## Non-goals

- <Explicitly out of scope, and why.>

## Users

| User | Job to be done | Frequency | Alternative if this doesn't exist |
|---|---|---|---|
| <role> | <what they're trying to accomplish> | <how often> | <what they'd do instead> |

<When users conflict: which one wins, and what that costs the other.>

## How we'll know it works

**Acceptance** — must be true to ship:
- <Observable criterion> — checked by: <test, query, or walkthrough>

**Judgment calls** — real criteria that can't be made observable:
- <Criterion, and who decides.>

**Failure in production** — what a break looks like and who notices first:
- <Symptom> → noticed by <whom>, via <what>

## Decisions

- **<Decision>** — <reasoning>. Rejected: <alternative>, because <reason>.

## Disagreements

- **<Topic>** — Claude recommended <X> because <reason>; <user> chose <Y> because
  <reason>. Called by <whom>.

## Assumptions

| Assumption | Blast radius if wrong | Status |
|---|---|---|
| <what we're believing> | <what changes> | confirmed / unverified |

## Open questions

- **<Question>** — parked. Settled by: <the experiment, fact, or person that would close
  it>. Blast radius: <high/medium/low>.

## Artifacts

- [`artifacts/<name>`](artifacts/<name>) — <what it is and what it decided>

## Not covered

<Phases the session didn't reach, if it ended early. Say which and why.>
```
