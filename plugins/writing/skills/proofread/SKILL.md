---
name: proofread
description: Proofread a draft for spelling, capitalization, punctuation, and dictation artifacts without rewriting it. Preserves the author's voice; mechanical errors are fixed in place, wording suggestions are proposed for approval only. Use when asked to proofread, copyedit, clean up, or check a draft, post, or article.
---

# Proofread

Copyedit a draft. **You are a proofreader, not an editor.** The author's voice, rhythm, register, and word choices are the point of the draft — they are not defects to be smoothed out.

## The two tiers

Every change belongs to exactly one tier. Never blur them.

**Tier 1 — fix in place, silently correct.** Objective mechanical errors. There is a right answer and the draft has the wrong one.

- Misspellings and typos
- Proper-noun capitalization (see `references/style.md`)
- Sentence-start and mid-sentence capitalization errors
- Missing, doubled, or misplaced punctuation: periods, commas, apostrophes, quotation marks
- Punctuation inside vs. outside quotation marks
- Doubled spaces, leading spaces on paragraphs, trailing whitespace
- Missing spaces after punctuation (a common dictation artifact — `C# and.NET` → `C# and .NET`)
- Homophone errors: its/it's, your/you're, their/there/they're, then/than
- Subject–verb agreement and other outright grammatical errors
- Hyphenation of established compounds: `full-stack`, `front-end`, `bug-free`, `self-taught`

**Tier 2 — propose only, never apply.** Anything involving judgment about wording. Report these; do not touch the file.

- A sentence that is genuinely hard to parse (usually a dictation run-on)
- A garbled clause where the intent is clear but the words came out scrambled
- An obviously repeated word or phrase within a few sentences
- A factual or internal inconsistency

Cap Tier 2 at roughly five items per draft, ordered worst-first. If a draft has more, you are editing, not proofreading — pick the five that actually impede a reader.

## Never do these

- Do not tighten, condense, or "improve flow."
- Do not remove conversational openers and filler that carry voice: `Oftentimes`, `Well,`, `And that's how...`, `Let me introduce myself a little bit.`
- Do not raise the register or make prose more formal. Contractions, sentence fragments, and first-person asides stay.
- Do not restructure paragraphs, reorder sentences, or merge/split paragraphs.
- Do not substitute a "better" synonym for a correct word.
- Do not add headings, transitions, or connective tissue.
- Do not convert em-dash/comma choices to your own preference.
- Do not change frontmatter values other than fixing a misspelling inside `title` or `subtitle`. Never touch `status`, `created`, `published`, `substack_url`, or `tags`.
- Do not touch text inside fenced code blocks or inline code spans.

When unsure whether something is Tier 1 or Tier 2: it is Tier 2. When unsure whether something is Tier 2 or voice: it is voice — leave it alone.

## Procedure

1. Read the whole draft before changing anything, to learn the author's patterns. A construction used deliberately three times is style, not error.
2. Read `references/style.md` for proper nouns and house-style decisions.
3. Read the local override if it exists — first `<cwd>/.claude/proofread-style.local.md`, else `~/.claude/proofread-style.local.md`. It holds this author's real proper nouns, house decisions, and voice patterns, and **wins over `references/style.md` on any conflict**. If neither exists, proceed on the generic reference alone; do not create one unprompted.
4. Apply all Tier 1 fixes with `Edit`. One edit per distinct issue so the diff stays readable.
5. Collect Tier 2 items with enough quoted context to locate them.
6. Report using the format below.
7. If this pass turned up a new proper noun or a recurring author preference, append it to the **local override**, creating it at `<cwd>/.claude/proofread-style.local.md` if needed. Never append author-specific detail to `references/style.md` — that file is shared and published.

Prose written by dictation is the default assumption. That means the high-yield Tier 1 categories are missing/extra spaces around punctuation, run-together words, mangled proper nouns, and comma splices where a speaker paused.

## Report format

```
Proofread: drafts/<file>.md — N mechanical fixes

Fixed
- "Jason" → "JSON" (3×)
- "C# and.NET" → "C# and .NET"
- Removed leading space on 4 paragraphs; collapsed 2 doubled spaces

Suggestions (not applied)
1. Para 5, "Having spent years on..." — the sentence runs ~55 words and
   the main clause is hard to find. Possible split after "...at scale."
2. ...
```

State the count of mechanical fixes plainly. If there were none, say so — a clean draft is a real result, not an invitation to find something.

## Building the local layer

`references/style.md` is a strong generic foundation. The local override is the personal
layer on top of it. When no local override exists, build one — but *after* the proofread,
never before.

This ordering matters. A cold questionnaire asks the author to introspect about writing
habits they are not aware of having. Running the pass first means you are holding
evidence: constructions you saw three times, proper nouns you had to guess at, style forks
where the generic default may be wrong for them. Ask about *those*, with the quotes.

**When to offer.** After reporting, if no local override was found and this pass produced
at least two concrete candidates. Once per session, and only after a pass that actually
had findings. If the author declines, drop it — do not re-offer, and never let this block
or delay the proofread itself.

**What to ask about**, in priority order. Cap it at the top three or four; a long
interrogation gets abandoned halfway.

1. **Proper nouns you guessed at.** Personal and company names, product names, anything
   where you applied a correction you were not certain about. Highest value: these recur
   in every draft and getting one wrong is embarrassing in public.
2. **Constructions hit by the three-times rule.** Anything used deliberately three or more
   times that you left alone. "You opened four sentences with *And* — voice, or should I
   flag it?" This is the highest-signal question and the author usually has an instant
   answer.
3. **Style forks where the generic default is a guess.** Only ask when the draft actually
   diverged: serial comma, US vs. British quotation convention, sentence vs. title case in
   headings, self-capitalized job titles.
4. **Anything you flagged as Tier 2 that turns out to be habit** rather than error.

Use `AskUserQuestion` with multi-select for the voice-versus-error batch — it is a fast
scan for the author and gives you clean answers. Quote the actual passage in each option
so they are judging their own prose, not an abstraction.

**Where it goes.** Write confirmed answers to `<cwd>/.claude/proofread-style.local.md`,
creating it if needed, in the same section structure as `references/style.md` so the two
read as one document. Add `*.local.md` to the drafts repo's `.gitignore` if it is not
already covered. Never write author-specific detail into `references/style.md` — that file
is shared and published.

On later passes, keep appending to the local file as new patterns pass the three-times
rule. Mention what you added in one line at the end of the report; do not re-ask about
something already recorded there.

Ask before proofreading more than one file in a single request unless the author named them all.
