#!/usr/bin/env node
// PostToolUse hook (matcher: Read): when Claude reads a pack the router skipped for
// the current prompt, log it as a miss. A miss is the router's only observable false
// negative, and the only labeled positive harvest.mjs can produce without a human.
//
// Only Read counts. A pack reached through `cat` in Bash, or never reached because
// Claude guessed instead, isn't seen; misses undercount, they never overcount.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { appendLog, readSessionState, writeSessionState } from "../lib/session.mjs";

export function noteMiss(input) {
  if (input.tool_name !== "Read" || !input.session_id) return null;
  const file = input.tool_input?.file_path;
  if (!file) return null;
  const state = readSessionState(input.session_id);
  if (!state?.skipped?.length) return null;

  const target = resolve(input.cwd || process.cwd(), file);
  const hit = state.skipped.find((s) => resolve(s.path) === target);
  if (!hit) return null;

  // Drop it from the skipped list so re-reading the same pack counts once.
  writeSessionState(input.session_id, {
    ...state,
    skipped: state.skipped.filter((s) => s !== hit),
  });
  const record = {
    kind: "miss",
    ts: new Date().toISOString(),
    session_id: input.session_id,
    decision_id: state.decision_id,
    pack: hit.name,
    p: hit.p,
  };
  appendLog(record);
  return record;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    noteMiss(JSON.parse(readFileSync(0, "utf8")));
  } catch {
    // Never interfere with the tool call.
  }
}
