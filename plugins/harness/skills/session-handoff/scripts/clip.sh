#!/usr/bin/env bash
# Copy stdin to the system clipboard. Prints the tool used, or fails loudly.
set -euo pipefail

for candidate in "pbcopy" "wl-copy" "xclip -selection clipboard" "xsel --clipboard --input" "clip.exe"; do
  tool=${candidate%% *}
  if command -v "$tool" >/dev/null 2>&1; then
    # shellcheck disable=SC2086
    $candidate
    echo "copied to clipboard via $tool" >&2
    exit 0
  fi
done

echo "no clipboard tool found (tried pbcopy, wl-copy, xclip, xsel, clip.exe)" >&2
exit 1
