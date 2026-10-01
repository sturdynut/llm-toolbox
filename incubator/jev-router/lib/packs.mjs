// Context packs: markdown files with a frontmatter `description` that Jev reads to
// decide whether the pack is needed. The body is what gets injected.
//
//   ---
//   description: Release process, version bumps, and the changelog format.
//   always: false        # optional; true = inject every time, never ask Jev
//   ---
//   ...body...
//
// The description is the only part Jev sees, so write it as "what's in here", not
// "when to use me": Jev compares it against the prompt.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

export function parsePack(path, text) {
  let meta = {};
  let body = text;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (m) {
    body = text.slice(m[0].length);
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
    }
  }
  return {
    name: basename(path, ".md"),
    path,
    description: meta.description || "",
    always: meta.always === "true",
    body: body.trim(),
  };
}

export function loadPacks(dir) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_") && f.toLowerCase() !== "readme.md")
    .sort()
    .map((f) => parsePack(join(dir, f), readFileSync(join(dir, f), "utf8")))
    .filter((p) => p.always || p.description);
}

// The one place the question is worded. The hook, the seed items, and harvested
// items all go through here, so calibration measures the question the hook asks.
export function packQuestion(pack) {
  return {
    type: "noul",
    instructions: {
      pack: { name: pack.name, contains: pack.description },
      question:
        "To respond well to `prompt`, read in light of `recent_conversation`, would it help to have the information described in `pack`?",
    },
    criteria: {
      true: "The task touches what `pack` covers, even partly or indirectly.",
      false: "The task has nothing to do with what `pack` covers.",
    },
  };
}
