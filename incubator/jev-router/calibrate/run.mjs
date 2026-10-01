#!/usr/bin/env node
// Send calibration items to Jev, one request per item, and append each answer to a
// results file. Resumable: ids already in --out are skipped, so a rate-limit stall or
// a crash costs nothing already paid for.
//
// Usage: run.mjs --out results.jsonl [--concurrency 8] [--model jev-1.13.0] items.jsonl...
//
// One item per request rather than fanning many questions into one state: each item
// has its own state, and packing unrelated items together would let them leak into
// each other's answers.

import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { systemOne } from "../lib/jev.mjs";

export function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

export async function runItems(items, { out, concurrency = 8, model, client = systemOne } = {}) {
  // Errors are not "done": a failed item is retried on the next run.
  const done = new Set(readJsonl(out).filter((r) => !r.error).map((r) => r.id));
  const todo = items.filter((it) => !done.has(it.id));
  let next = 0;
  let failed = 0;

  async function worker() {
    while (next < todo.length) {
      const item = todo[next++];
      const rec = {
        id: item.id,
        family: item.family,
        label_quality: item.label_quality,
        type: item.question.type,
        key: item.key,
      };
      try {
        const res = await client({ state: item.state, model, questions: { q: item.question } });
        Object.assign(rec, { model: res.model, answer: res.answers.q, usage: res.usage });
      } catch (err) {
        failed++;
        rec.error = err.message;
      }
      appendFileSync(out, JSON.stringify(rec) + "\n");
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker));
  return { skipped: items.length - todo.length, ran: todo.length, failed };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const flags = {};
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) flags[args[i].slice(2)] = args[++i];
    else files.push(args[i]);
  }
  if (!flags.out || files.length === 0) {
    console.error("usage: run.mjs --out results.jsonl [--concurrency 8] [--model id] items.jsonl...");
    process.exit(2);
  }
  const items = files.flatMap(readJsonl);
  const ids = new Set();
  for (const it of items) {
    if (ids.has(it.id)) throw new Error(`duplicate item id: ${it.id}`);
    ids.add(it.id);
  }
  const r = await runItems(items, {
    out: flags.out,
    concurrency: Number(flags.concurrency) || 8,
    model: flags.model,
  });
  console.error(`ran ${r.ran}, skipped ${r.skipped} already done, ${r.failed} failed`);
  if (r.failed) process.exit(1);
}
