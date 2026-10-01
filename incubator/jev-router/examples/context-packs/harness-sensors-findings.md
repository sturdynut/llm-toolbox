---
description: Measured costs and known bugs in the context-guard and session-weight hooks (incubator/harness-sensors) — the warning-suppression bug, the drift check's token cost, the mistimed band on 1M windows, and the fix list required before re-publishing.
---
- `loop` warnings outrank the 65% fill warning and suppress it for the rest of the session (confirmed).
- Drift check ≈ $0.028/call; `--strict-mcp-config --setting-sources ""` makes it ≈ $0.0105 with the same answer.
- `[40%, 65%)` of a 1M window is too late; gate on absolute tokens.
- `firstUserText` picks up `<local-command-caveat>` in ~10% of sessions.
- Fix list and measurements: `incubator/harness-sensors/README.md`.
