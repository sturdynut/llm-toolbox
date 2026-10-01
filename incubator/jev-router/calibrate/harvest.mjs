#!/usr/bin/env node
// Turn the router's decision log into calibration items.
//
// Usage: harvest.mjs [decisions.jsonl] > items/harvested.jsonl
//        (default: $JEV_ROUTER_LOG_DIR/decisions.jsonl)
//
// Labels, per (decision, pack) that Jev was asked about:
//   miss  key 1  skipped, then Claude Read it. The router was wrong, observably.
//   weak  key 0  skipped and never read. Probably not needed, but Claude may have
//                guessed instead of reading, so this is not ground truth.
//   (none)       included. Whether it was needed isn't observable, so no item.
//
// Re-running Jev on these items asks the same question (the decision log stores it)
// about the same state, so a fresh run measures the current model on your traffic.

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { readJsonl } from "./run.mjs";
import { logDir } from "../lib/session.mjs";

export function harvest(records) {
  const misses = new Set(
    records.filter((r) => r.kind === "miss").map((r) => `${r.decision_id}\u0000${r.pack}`),
  );
  const items = [];
  for (const d of records) {
    if (d.kind !== "decision" || d.error) continue;
    for (const p of d.packs) {
      if (!p.question || p.included) continue;
      const miss = misses.has(`${d.id}\u0000${p.name}`);
      items.push({
        id: `harvest-${d.id}-${p.name}`,
        family: "context_select",
        label_quality: miss ? "miss" : "weak",
        state: d.state,
        question: p.question,
        key: miss ? 1 : 0,
        logged_p: p.p,
      });
    }
  }
  return items;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2] || join(logDir(), "decisions.jsonl");
  const items = harvest(readJsonl(path));
  for (const it of items) process.stdout.write(JSON.stringify(it) + "\n");
  const m = items.filter((i) => i.label_quality === "miss").length;
  console.error(`harvested ${items.length} items: ${m} miss, ${items.length - m} weak`);
}
