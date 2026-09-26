# incubator

Staging area for skills, hooks, and agents that don't yet belong to a plugin.

Nothing here is installed — the marketplace only exposes `plugins/`. This is a holding
pen so a half-formed idea has somewhere to live that isn't a premature new domain.

**Promotion rule:** once a thing has been used twice, move it into a plugin. If it doesn't
fit any existing domain after that, *then* consider a new one.

## Currently here

- **`harness-sensors/`** — two cost-measuring hooks and a status line, pulled out of the
  published `harness` plugin on 2026-09-12 after an audit found a confirmed warning-
  suppression bug and a drift layer costing ~$4.46 for one emitted warning. Runs fine;
  not fit to install. Its README carries the measurements and the fix list.

- **`mirror-test/`** — a skill that tests whether a model's claims about itself match what
  it does. It checks whether stated confidence matches accuracy, how the model handles
  rules it has never seen, whether it finds a planted error or gives in to pushback,
  how it handles introspection, and how much the framing of a question moves its
  answer. Subjects run in isolated, tool-less `claude -p` contexts, or through
  paste-ready prompts for other vendors' models, and a separate context grades them
  blind. It fits none of the current domains. The directory is a bare skill, so to use
  it before promotion, symlink it into place:
  `ln -s ~/Code/llm-toolbox/incubator/mirror-test ~/.claude/skills/`.
