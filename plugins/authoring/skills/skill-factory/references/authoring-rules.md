# Skill authoring rules

Cross-vendor guidance, distilled. Read the section you need; the SKILL.md links here from
step 5.

## Contents

- Sources
- The two budgets
- Concision and the no-op test
- Degrees of freedom
- Descriptions and pointers
- Progressive disclosure and the information hierarchy
- Leading words and negation
- Steps, completion criteria, and feedback loops
- Evaluation
- Anti-patterns

## Sources

| Source | What it's strongest on |
|---|---|
| [Anthropic, Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) | Hard limits, degrees of freedom, progressive-disclosure patterns, the checklist |
| [Anthropic `skill-creator`](https://github.com/anthropics/skills/tree/main/skills/skill-creator) | The build→eval→rewrite loop, baseline-vs-skill A/B, description pushiness |
| [Matt Pocock, `writing-for-agents`](https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-for-agents) | Context vs. cognitive load, pointers, leading words, pruning, completion criteria |
| [OpenAI, Build skills](https://learn.chatgpt.com/docs/build-skills) | Same SKILL.md shape; explicit "prefer instructions over scripts"; boundary-first descriptions |

The three converge more than they differ. Where they differ it is worth knowing: Anthropic
optimizes for a skill shipped to strangers and leans on evals; Pocock optimizes for a
personal `.agents/` directory and leans on prose discipline. This repo is the second case
with occasional public distribution, so both apply.

## The two budgets

Every document and pointer spends one of two:

- **Context load** — always-loaded material: the description, anything in the system
  prompt. Costs tokens and attention every turn whether or not it fires.
- **Cognitive load** — cost on the human: remembering which skills exist and when to reach
  for one. Not a cost to minimize; it is the price of human agency. Spend it where human
  judgment matters.

Material behind a pointer escapes context load at the price of the pointer's own line.
Material with no pointer rides entirely on cognitive load. That is the whole trade behind
`disable-model-invocation`.

## Concision and the no-op test

Only add context the model doesn't already have. For each sentence: **does this change
behaviour versus its absence?** If not, delete the whole sentence — don't trim words from
it. The test is model-relative, not reader-relative: two people disagreeing about a no-op
are disagreeing about the model's default, and settle it by running the skill.

Anthropic's example: ~50 tokens of "use pdfplumber, here's the snippet" beats ~150 tokens
explaining what a PDF is.

The same test grades emphasis. `be thorough` when the model is already thorough-ish is a
no-op; the fix is a stronger word, not more words.

## Degrees of freedom

Match specificity to the task's fragility.

| Freedom | Use when | Form |
|---|---|---|
| High | many valid approaches, context decides | prose, principles, a numbered outline |
| Medium | a preferred pattern with acceptable variation | pseudocode, a parameterized template |
| Low | fragile, order-dependent, consistency critical | the exact command, "do not modify it" |

The analogy: an open field versus a narrow bridge with cliffs. Over-specifying an open
field makes the skill brittle; under-specifying a bridge makes it useless.

## Descriptions and pointers

A description is a **context pointer**: it names out-of-context material and encodes the
condition for reaching it. Its *wording*, not its target, decides when and how reliably
the material gets reached.

- Third person, always — it is injected into a system prompt.
- Front-load the leading word; the pointer does its triggering work at the start.
- State what it does **and** the branches that should trigger it.
- One trigger per branch. Synonyms renaming one branch are one branch written twice.
- Cut identity the body already carries.
- Lean slightly pushy: the observed failure mode is under-triggering.
- Name the near miss it must not hijack, when one exists.

Hard limits: `name` ≤ 64 chars, lowercase/numbers/hyphens, no reserved words
(`anthropic`, `claude`). `description` ≤ 1,024 chars, non-empty, no XML tags.

## Progressive disclosure and the information hierarchy

Three tiers, ranked by how immediately the material is needed:

1. **In-file step** — what the agent does, in order.
2. **In-file reference** — consulted on demand; a flat peer-set of rules is fine here.
3. **Disclosed reference** — a separate file behind a pointer, loaded only when it fires.

Push too little down and the top bloats; push too much and you hide what's needed. The
cleanest test is branching: **inline what every branch needs, disclose what only some
branches reach.**

Mechanics:

- Body under 500 lines.
- References exactly one level deep from SKILL.md. Nested references get previewed with
  `head -100` instead of read, so the information silently goes missing.
- Any reference over ~100 lines gets a table of contents, so a partial read still shows
  the full scope.
- Name files for their content: `form-validation-rules.md`, not `doc2.md`.
- Organize multi-domain skills by domain (`references/aws.md`, `references/gcp.md`) so an
  AWS question never loads the GCP file.
- **Co-location**: keep a concept's definition, rules, and caveats under one heading.
  Scattering one meaning across a file is a different defect from duplicating it, and
  worse.
- **Sprawl** is the failure mode even when every line is live: attention thins across
  excess. Cure it by disclosing reference and splitting by branch.

## Leading words and negation

A **leading word** is a compact concept already in the model's pretraining that the agent
thinks with while running the skill — *tracer bullet*, *red*, *fog of war*. Repeated as a
token, never as a sentence, it anchors a region of behaviour in very few tokens by
recruiting priors the model already holds. Coining your own works only if you define it,
and you pay in definition tokens what a pretrained word gives free.

Hunt for passages that collapse into one: "fast, deterministic, low-overhead" → *tight*.

**Negation is the failure mode beside it.** Steering by prohibition drags the forbidden
behaviour into context and makes it *more* available. Prompt the positive so the banned
behaviour is never spoken. A prohibition earns its place only as a hard guardrail you
cannot phrase positively — and even then, pair it with the positive target.

## Steps, completion criteria, and feedback loops

Every step ends on a **completion criterion** — how the agent knows it's done. Two
properties matter:

- **Clarity.** A vague bound ("understanding reached") invites *premature completion*:
  attention slips to being done, pulled by the visible steps still ahead. Sharpen the bound
  first; only split the sequence if it is irreducibly fuzzy and you observe the rush. Note
  that splitting only helps across a real context boundary — a handoff or a subagent.
- **Demand.** "Every modified model accounted for" forces more legwork than "produce a
  change list." Demand is not step-bound: "every rule applied" binds a flat body of
  reference the same way.

For multi-step work, give a checklist the agent copies into its response and ticks off.
For quality-critical work, build a **feedback loop**: run validator → fix → repeat, and
say "only proceed when validation passes." The validator can be a script or a reference
document the agent checks against.

For open-ended batch work, use **plan → validate → execute**: have the agent write a
structured plan to a file, validate that file, and only then apply it.

## Evaluation

Build evals *before* writing extensive documentation, so the skill solves observed
problems rather than imagined ones:

1. Run the task with no skill. Record the specific failures.
2. Write three scenarios that test those gaps.
3. Baseline: measure behaviour without the skill.
4. Write the minimum content that closes the gaps.
5. Iterate: compare against baseline.

Anthropic's `skill-creator` runs each case twice in parallel — once with the skill, once
without (or against the previous version when improving) — because "it worked" means
nothing without the baseline.

Then watch how the agent actually navigates the skill:

- reads files in an unexpected order → the structure isn't as intuitive as you thought
- never follows a reference → the pointer is too weak or buried
- re-reads one file constantly → that content belongs in SKILL.md
- never touches a bundled file → it's unnecessary or unsignposted

Test across the models you'll actually use. What Opus infers, Haiku may need spelled out.

## Anti-patterns

- Vague names: `helper`, `utils`, `tools`, `documents`, `data`.
- First or second person in the description.
- Offering many options ("use pypdf, or pdfplumber, or PyMuPDF…") instead of a default
  with a named escape hatch.
- Windows-style paths. Forward slashes everywhere.
- Time-sensitive statements ("before August 2025, use the old API"). Put superseded
  material in an "old patterns" section instead.
- Inconsistent terminology — pick one word per concept and keep it.
- Unqualified MCP tool names. Use `ServerName:tool_name`.
- Assuming packages are installed; say how to install them.
- **Voodoo constants** in scripts (`TIMEOUT = 47`). If you can't justify the value, the
  agent can't either.
- Scripts that defer their errors to the agent instead of handling them.
- **Duplication** — the same meaning in two places inflates its apparent rank and makes
  every change a two-place edit. Keep one source of truth.
- **Caching the environment** — restating `package.json` scripts or `--help` output. Cache
  only what the agent cannot look up: the unwritten convention, the reason behind a choice,
  the gotcha no config confesses.
- **Sediment** — stale layers that accumulate because adding feels safe and removing feels
  risky. Prune on every edit.
