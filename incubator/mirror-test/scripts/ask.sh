#!/usr/bin/env bash
# Send one prompt file to a model in an isolated, tool-less context and print the reply.
#
# Usage: ask.sh <model-id> <prompt-file> [system-prompt]
#
# Used for subject runs and for the blind grader. The flags are the point: no tools
# (so a subject can't run code to count letters), a fixed system prompt instead of
# Claude Code's (which would make Part 4 a test of "Claude Code" rather than the model),
# and no MCP servers, hooks, or CLAUDE.md chain. The system prompt used is recorded in
# the report, since it is a variable.
set -euo pipefail

model="${1:?model id required}"
prompt_file="${2:?prompt file required}"
system="${3:-You are a helpful assistant.}"

[[ -f "$prompt_file" ]] || { echo "ask.sh: no such file: $prompt_file" >&2; exit 2; }
command -v claude >/dev/null || { echo "ask.sh: the claude CLI is not on PATH" >&2; exit 2; }

out=$(claude -p "$(cat "$prompt_file")" \
  --model "$model" \
  --tools "" \
  --system-prompt "$system" \
  --strict-mcp-config \
  --setting-sources "" \
  --output-format json < /dev/null)

python3 - "$out" <<'PY'
import json, sys
d = json.loads(sys.argv[1])
if d.get("is_error"):
    sys.stderr.write(f"ask.sh: model call failed: {d.get('result')}\n"); sys.exit(1)
print(d["result"])
PY
