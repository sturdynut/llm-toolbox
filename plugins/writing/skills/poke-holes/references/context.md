# Red-team context

Calibration for the poke-holes skill: how hard to press, what to verify, and what to leave
alone. This file is generic and shared. Everything author-specific lives in a local
override.

## Local overrides

Author- and publication-specific calibration — who is writing, who reads it, what they
have already argued in print — lives in a local override, loaded if present:

1. `<cwd>/.claude/poke-holes-context.local.md`
2. `~/.claude/poke-holes-context.local.md`

**The local file wins on any conflict.** Read it after this one and apply its calibration
over these defaults. Append newly learned author patterns and cross-post positions
*there* — never to this file. Gitignore `*.local.md` in the drafts repo.

Without a local override the skill still works; it just red-teams generically, without
knowing the audience's floor or the author's history. See "Building the local layer" in
`SKILL.md` for how that file gets populated.

## Calibrating to the audience

Two axes decide most of what to flag. Get them from the local override, or infer from the
draft and say which you assumed.

**Technical floor.** For a practitioner audience, a missing definition of something they
use daily is *not* a hole — flagging it is noise, and it trains the author to ignore you.
For a general audience, an undefined term genuinely is a hole. When in doubt, infer the
floor from the draft's own vocabulary: whatever it uses without defining is the floor.

**Register.** A short opinionated post and a comprehensive survey fail differently. Under
brevity, "you didn't cover X" is almost never a valid finding — only flag an omission when
its absence makes what *is* present wrong or trivially rebuttable.

## Claims that need verification

Ranked by how often they turn out to be wrong. Verify rather than assume; if you cannot
verify, flag as *needs checking* instead of asserting it is wrong.

- **Quantitative thresholds.** Any specific number presented as a clean cutoff ("past N
  layers you get diminishing returns," "N% faster"). Real curves are usually trade-offs
  against other variables, and the clean threshold is an artifact of the telling. Ground
  the number in a cited result or soften it to a direction.
- **Mechanism claims about live tools.** APIs, model behavior, framework internals, and
  CLI flags shift between versions. A specific behavior stated as timeless fact is a
  standing liability. Date it or attribute it to a version.
- **Cost and performance claims.** Usually directionally true and wildly wrong in
  magnitude — real per-unit, negligible in absolute terms, material only at scale or in a
  loop. Flag when a small effect is stated as if it were large.
- **Comparative quality claims.** "X produces better output than Y" is task-dependent and
  rarely holds universally. Needs a concrete example or an explicit "in my experience"
  frame, not assertion.
- **Causal claims** from correlational or anecdotal evidence — "we did X and Y improved."
  Ask what else changed.
- **Attributed quotes and statistics.** Widely repeated ones are often misattributed or
  distorted from the original. Check before they ship.

## Generic weak spots to watch

Patterns that recur across most authors. The local override records which ones a *specific*
author actually has, so the skill can say "you did this again."

- A defensible narrow point stated at indefensible width ("always," "never," "everyone").
- A quality claim asserted without a single concrete example.
- A number that arrived by vibe and hardened into a fact across drafts.
- An analogy carrying argumentative weight it cannot support.
- A strawman of the opposing view that a reader will recognize as one.
- Burying the actual thesis under the setup.
- Contradicting a position the author took in an earlier post.

## Cross-post consistency

Posts by one author are read as one body of work; a claim that contradicts an earlier
piece is a hole even when it is locally correct. Tracking specific positions requires
knowing what was published before, so it lives in the local override. When you spot a
claim likely to constrain future posts, note it there.

## What does not belong in this file

Anything only true of one author, publication, or audience — names, employers, topic
lists, specific past claims. That is local-override material by definition.
