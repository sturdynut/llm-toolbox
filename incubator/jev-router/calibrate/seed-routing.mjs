#!/usr/bin/env node
// Hand-labeled context-selection items over examples/context-packs.
//
// Usage: seed-routing.mjs > items/routing-seed.jsonl
//
// These labels are judgments, not computations, so they're marked `hand` and scored
// in their own row. They exist so the router's real question gets measured from day
// one; replace them with your own prompts and packs, and with harvest.mjs output as
// misses accumulate. Each case is meant to be clear-cut: if you'd argue a label,
// drop the case rather than keep a disputed key.

import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadPacks, packQuestion } from "../lib/packs.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export const CASES = [
  { prompt: "Add a new skill for summarizing PRs. Where does it go and what frontmatter should it have?", needs: ["marketplace-layout"] },
  { prompt: "Scaffold a weather MCP server and wire it into the ui plugin.", needs: ["mcp-servers", "marketplace-layout"] },
  { prompt: "Proofread this paragraph from my blog draft: 'Their going to love the new release, which ships tomorow.'", needs: ["writing-calibration"] },
  { prompt: "Why does context-guard never warn me at 70% after it flagged a loop earlier?", needs: ["harness-sensors-findings"] },
  { prompt: "What's 17% of 2,340?", needs: [] },
  { prompt: "Rename the variable `cnt` to `count` in scripts/ask.sh.", needs: [] },
  { prompt: "Is the drift check in context-guard worth what it costs per call?", needs: ["harness-sensors-findings"] },
  { prompt: "Write tests for the tradingview server using the repo's test runner.", needs: ["mcp-servers"] },
  {
    prompt: "go for it",
    recent: [
      { role: "user", text: "Should the session-weight hook move from incubator into the harness plugin now?" },
      { role: "assistant", text: "Yes, once the fixes in its README land: split the loop warning out of the fill ladder, add the strict-MCP flags, and add the regression tests. Then move the directory under plugins/harness/hooks/ and reference it with ${CLAUDE_PLUGIN_ROOT}." },
    ],
    needs: ["harness-sensors-findings", "marketplace-layout"],
  },
  {
    prompt: "yes, do that",
    recent: [
      { role: "user", text: "Can you tighten the intro of my post on calibration? It rambles." },
      { role: "assistant", text: "I can cut the second and third sentences and lead with the 83%-vs-19% number. Want me to?" },
    ],
    needs: ["writing-calibration"],
  },
];

export function seedItems(packs = loadPacks(join(here, "..", "examples", "context-packs"))) {
  const names = new Set(packs.map((p) => p.name));
  const items = [];
  CASES.forEach((c, i) => {
    for (const n of c.needs) if (!names.has(n)) throw new Error(`case ${i}: unknown pack ${n}`);
    for (const pack of packs) {
      items.push({
        id: `routing-seed-${i}-${pack.name}`,
        family: "context_select",
        label_quality: "hand",
        state: { project: "llm-toolbox", prompt: c.prompt, recent_conversation: c.recent || [] },
        question: packQuestion(pack),
        key: c.needs.includes(pack.name) ? 1 : 0,
      });
    }
  });
  return items;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const it of seedItems()) process.stdout.write(JSON.stringify(it) + "\n");
}
