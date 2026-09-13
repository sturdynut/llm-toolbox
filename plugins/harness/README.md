# harness

Changes how Claude Code itself runs — session hygiene and context handling. Named for the
layer it operates on rather than any one artifact, so future session and settings tooling
has an obvious home here.

The two cost sensors (`context-guard`, `session-weight`) and the status line that used to
live here now sit in `incubator/harness-sensors/` — they measure cost, and had not
themselves been measured. See that README for what the audit found.

## Session handoff

`skills/session-handoff/`, invoked as `/harness:session-handoff [output-path]`. Where the
two hooks *warn* that a session has grown expensive, this is what you run once they have.

It extracts what only exists in the conversation — decisions and the alternatives they
beat, dead ends and why they failed, verbatim user constraints, what is actually verified
versus merely claimed, and the single next action — into
`.claude/handoffs/<timestamp>-<slug>.md`, writes a companion `.primer.md`, and copies the
primer to the clipboard via `scripts/clip.sh` (pbcopy → wl-copy → xclip → xsel →
clip.exe). Paste it into a fresh session.

The deliberate omission is anything the next session can read off disk. Code, file
contents, and chronology are excluded by the skill; a handoff that summarizes the repo has
spent tokens to save none. Every state claim is graded **verified / claimed / assumed**,
because an ungraded "tests pass" is the one line that can cost the next session an hour.

`disable-model-invocation: true` — it writes files and clobbers the clipboard, so it fires
only when you ask for it. Claude can still suggest it by name.

You probably want `.claude/handoffs/` in `.gitignore`; the skill mentions this but never
edits the file.
