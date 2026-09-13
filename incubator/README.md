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
