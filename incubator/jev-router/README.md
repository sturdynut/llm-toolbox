# jev-router

Uses [Jev](https://docs.typesafe.ai/introduction) (TypeSafe's typed-decision model) as a
**context router** for Claude Code, plus a harness for checking whether Jev's
probabilities can be trusted before anything depends on them.

```
prompt ─▶ Jev: which packs does this need? ─▶ inject those, list the rest ─▶ Claude
                                                          │
                       Claude Reads a skipped pack ◀──────┘  (logged as a miss)
                                    │
                    harvest.mjs ─▶ labeled items ─▶ run.mjs ─▶ score.mjs ─▶ report
```

**Status: built and tested against a local stub of the API, but not yet run against
real Jev.** Every number in a report so far came from the stub. The first real step is
the calibration run below.

## Why calibration comes first

The router includes a pack when Jev's p(yes) clears a threshold. That only works if
p(yes) means something, and public claims say it might not (one widely shared post
reported "83% confidence, 19% accuracy"). Calibration is also task-specific: a model
that is honest about one kind of question can be overconfident on another. So measure
it on the questions this pipeline actually asks.

## 1. Calibration

```sh
export TYPESAFE_API_KEY=...
cd incubator/jev-router

# Items whose keys are computed in code: path membership, scope gating with `..`
# traversal, log ordering, argmax, counting. Balanced, seeded, reproducible.
node calibrate/gen-computed.mjs --n 40 --seed 1 > calibrate/items/computed.jsonl

# Hand-labeled context-selection items over examples/context-packs (already generated).
node calibrate/seed-routing.mjs > calibrate/items/routing-seed.jsonl

node calibrate/run.mjs --out results.jsonl --model jev-1.13.0 calibrate/items/*.jsonl
node calibrate/score.mjs results.jsonl > report.md
```

That's 240 requests, about 300 input tokens each: roughly $0.003 at $0.042/Mtok. The
runner resumes, so a 429 stall costs nothing; re-run the same command.

The report gives:

- **Headline.** How often Jev was right when it put ≥80% on its answer.
- **By family.** Accuracy against mean stated probability, plus Brier score and ECE
  (expected calibration error) per family and label type.
- **Reliability table.** Stated probability bands against accuracy.
- **`confidence` against accuracy.** Choice and Score answers only. This field
  summarizes how spread the probabilities are; it isn't P(correct). The check is that
  accuracy goes up as it does.
- **Include-gate table.** Recall, precision, and share selected at each threshold, for
  every Noul family. **This is where you set `JEV_ROUTER_THRESHOLD`.**
- **What this does not show.**

Pin a versioned model (`jev-1.13.0`) for calibration runs. `jev-latest` moves on
release, and thresholds tuned against one version don't carry over to the next.

### Item format

One JSON object per line. Add your own decision types the same way:

```json
{"id": "unique", "family": "my_decision", "label_quality": "hand",
 "state": "...or an object...",
 "question": {"type": "noul|choice|score", "instructions": "...", "criteria": "..."},
 "key": "1/0 for noul, the option name for choice, the level index for score"}
```

`label_quality` is `computed` (key from code), `hand` (your judgment), `miss`, or
`weak` (both harvested; see below). The report scores each kind in its own row.

## 2. The context-selection hook

**Context packs** are markdown files in `<project>/.claude/context-packs/`:

```markdown
---
description: Release process, version bumps, and the changelog format.
always: false
---
...the text that gets injected...
```

Jev sees only the `description`, so write it as what the pack *contains*. Set
`always: true` to inject a pack every time without asking Jev. A project with no packs
gets no output, so the hook is safe to wire globally.

On each prompt, `hooks/context-select.mjs`:

1. Sends Jev the prompt and the last three user/assistant turns, so a follow-up like
   "go for it" has something to route on, along with one Noul per pack. All the
   questions go in one request.
2. Includes packs with p(yes) ≥ `JEV_ROUTER_THRESHOLD` (default **0.2**, so a weak yes
   still gets the pack in), highest p first, up to `JEV_ROUTER_MAX_CHARS`.
3. Lists every skipped pack with its path and description, so Claude can Read it.
4. **Fails open.** If Jev errors, times out, or there's no key, it includes every pack
   that fits the budget and says selection was unavailable. That's the same as having
   no router.

`hooks/note-miss.mjs` (PostToolUse on Read) logs a **miss** when Claude reads a pack
that was skipped for the current prompt. A miss is the router's only visible false
negative.

`calibrate/harvest.mjs` turns the log into items:

| label | key | meaning |
|---|---|---|
| `miss` | 1 | Skipped, then read. Jev was wrong. |
| `weak` | 0 | Skipped and never read. Probably right, but Claude may have guessed instead of reading. |
| (no item) | | Included. Whether it was needed can't be observed. |

```sh
node calibrate/harvest.mjs > calibrate/items/harvested.jsonl
node calibrate/run.mjs --out results.jsonl --model jev-1.13.0 calibrate/items/harvested.jsonl
```

Harvested items reuse the exact question and state from the log, so re-running them
measures a new model version on your real traffic.

### Wiring it by hand

`hooks/hooks.json` is a plugin manifest and does nothing from `incubator/`. While the
router lives here, wire it with absolute paths in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "timeout": 10,
      "command": "node ~/Code/llm-toolbox/incubator/jev-router/hooks/context-select.mjs" }] }],
    "PostToolUse": [{ "matcher": "Read", "hooks": [{ "type": "command", "timeout": 5,
      "command": "node ~/Code/llm-toolbox/incubator/jev-router/hooks/note-miss.mjs" }] }]
  }
}
```

To try it on this repo without writing packs, set `JEV_ROUTER_PACKS` to the absolute
path of `examples/context-packs/`. Node doesn't expand `~` in that variable.

### Settings

| env | default | |
|---|---|---|
| `TYPESAFE_API_KEY` | none | required for selection; without it the hook fails open |
| `JEV_MODEL` | `jev-latest` | pin the version you calibrated against |
| `JEV_ROUTER_THRESHOLD` | `0.2` | include when p(yes) ≥ this |
| `JEV_ROUTER_MAX_CHARS` | `24000` | budget for injected pack text |
| `JEV_ROUTER_TIMEOUT` | `4000` | ms for the Jev call, retries included; keep it under the hook's 10s |
| `JEV_ROUTER_PACKS` | `<cwd>/.claude/context-packs` | |
| `JEV_ROUTER_LOG_DIR` | `~/.claude/jev-router` | `decisions.jsonl` and per-session state |
| `JEV_ROUTER_OFF` | | `1` disables the hook |
| `TYPESAFE_BASE_URL` | `https://api.typesafe.ai` | tests point this at a stub |

### What leaves the machine

Each prompt, plus the last three conversation turns (each cut to 1,500 characters), and
every pack's `description` go to `api.typesafe.ai`. Pack bodies never leave the machine.
The decision log stores prompts in full, locally, because harvesting needs them.

## Known gaps

- **Misses come only from Read.** A pack reached with `cat`, or never reached because
  Claude guessed instead of reading, isn't counted. So misses undercount, and `weak`
  labels contain some real misses.
- **The hand-labeled seed is small:** 10 prompts × 4 packs, all written by one person.
  It shows the format and gets the router's real question measured from day one. Your
  own prompts and harvested misses should replace it.
- **No routing or verification gate yet.** The `scope_gate` family already measures
  the question a PreToolUse gate would ask. Build the gate once that row's calibration
  justifies it.
- **There's no MCP server.** The hooks call the HTTP API directly with `fetch`. Per
  `CLAUDE.md`, an MCP tool is only worth building when Bash and Read can't do the job,
  and nothing here needs one yet.

## Tests

```sh
npm test    # node --test; no dependencies, no network (uses test/stub.mjs)
```
