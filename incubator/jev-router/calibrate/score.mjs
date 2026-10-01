#!/usr/bin/env node
// Score Jev's calibration from run.mjs results and print a markdown report.
//
// Usage: score.mjs results.jsonl... > report.md
//
// "Stated" is the probability Jev put on the answer it gave: max(p, 1-p) for a Noul,
// probabilities[choice] for a Choice, the top level's probability for a Score. A
// calibrated model is right about 80% of the time when stated is about 0.8. Jev's
// separate `confidence` field is a dispersion statistic derived from the distribution,
// not P(correct), so it gets its own table where the right check is that accuracy
// rises with it, not that the two numbers match.

import { pathToFileURL } from "node:url";
import { readJsonl } from "./run.mjs";

// Turn one result record into the numbers everything else is computed from.
export function judge(rec) {
  const a = rec.answer;
  if (rec.type === "noul") {
    const p = a.noul;
    const said = p >= 0.5 ? 1 : 0;
    return {
      stated: Math.max(p, 1 - p),
      correct: said === rec.key,
      brier: (p - rec.key) ** 2,
      pYes: p,
    };
  }
  // Choice and Score: argmax over the returned distribution. For Score the keys are
  // level indices as strings and `rec.key` is the index.
  const probs = a.probabilities;
  const keyStr = String(rec.key);
  const [top, pTop] = Object.entries(probs).sort((x, y) => y[1] - x[1])[0];
  const brier = Object.entries(probs).reduce(
    (s, [k, p]) => s + (p - (k === keyStr ? 1 : 0)) ** 2,
    0,
  );
  return {
    stated: pTop,
    correct: top === keyStr,
    brier,
    confidence: a.confidence,
    absError: rec.type === "score" ? Math.abs(a.score - rec.key) : undefined,
  };
}

export function bins(rows, field, edges = [0, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0001]) {
  const out = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const inBin = rows.filter((r) => r[field] >= edges[i] && r[field] < edges[i + 1]);
    if (inBin.length === 0) continue;
    out.push({
      lo: edges[i],
      hi: Math.min(edges[i + 1], 1),
      n: inBin.length,
      mean: mean(inBin.map((r) => r[field])),
      acc: mean(inBin.map((r) => (r.correct ? 1 : 0))),
    });
  }
  return out;
}

// Expected calibration error: bin-weighted |stated - accuracy|.
export function ece(rows) {
  const total = rows.length;
  return bins(rows, "stated").reduce((s, b) => s + (b.n / total) * Math.abs(b.mean - b.acc), 0);
}

// For a Noul used as an include/skip gate: at each threshold, how many true positives
// get through (recall) and how much else rides along (precision, share selected).
// The router wants high recall; this is where you pick its threshold.
export function thresholds(rows, ts = [0.05, 0.1, 0.2, 0.3, 0.5, 0.7]) {
  const pos = rows.filter((r) => r.key === 1);
  return ts.map((t) => {
    const sel = rows.filter((r) => r.pYes >= t);
    const tp = sel.filter((r) => r.key === 1).length;
    return {
      t,
      recall: pos.length ? tp / pos.length : NaN,
      precision: sel.length ? tp / sel.length : NaN,
      selected: rows.length ? sel.length / rows.length : NaN,
    };
  });
}

export function summarize(rows) {
  return {
    n: rows.length,
    acc: mean(rows.map((r) => (r.correct ? 1 : 0))),
    stated: mean(rows.map((r) => r.stated)),
    brier: mean(rows.map((r) => r.brier)),
    ece: ece(rows),
  };
}

// Latest successful record per id wins: run.mjs appends, and a retried item can appear
// once as an error and again as a success.
export function load(paths) {
  const byId = new Map();
  const failedIds = new Set();
  for (const rec of paths.flatMap(readJsonl)) {
    if (rec.error) failedIds.add(rec.id);
    else byId.set(rec.id, rec);
  }
  const rows = [...byId.values()].map((rec) => ({ ...rec, ...judge(rec) }));
  return { rows, errors: [...failedIds].filter((id) => !byId.has(id)).length };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const pct = (x) => (Number.isFinite(x) ? `${(x * 100).toFixed(0)}%` : "–");
const num = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : "–");
const groupBy = (xs, f) =>
  xs.reduce((m, x) => m.set(f(x), [...(m.get(f(x)) || []), x]), new Map());

export function report(rows, { errors = 0 } = {}) {
  const L = [];
  const models = [...new Set(rows.map((r) => r.model))];
  const s = summarize(rows);
  L.push("# Jev calibration report", "");
  L.push(`Model(s): ${models.join(", ") || "–"} · items scored: ${s.n}` + (errors ? ` · failed requests not scored: ${errors}` : ""));
  L.push("");

  const high = rows.filter((r) => r.stated >= 0.8);
  L.push("## Headline", "");
  L.push(
    `When Jev put **≥80%** on its answer it was right **${pct(mean(high.map((r) => (r.correct ? 1 : 0))))}** of the time (n=${high.length}). ` +
      `Overall: stated ${pct(s.stated)}, accuracy ${pct(s.acc)}, ECE ${num(s.ece)}.`,
  );
  L.push("");
  L.push("A gap between stated and accuracy in the same row is miscalibration. Rows with n < 10 are noise; don't tune on them.", "");

  L.push("## By family", "");
  L.push("| family | labels | type | n | accuracy | mean stated | gap | Brier | ECE |");
  L.push("|---|---|---|---:|---:|---:|---:|---:|---:|");
  for (const [, rs] of groupBy(rows, (r) => `${r.family}|${r.label_quality}`)) {
    const f = summarize(rs);
    L.push(
      `| ${rs[0].family} | ${rs[0].label_quality} | ${rs[0].type} | ${f.n} | ${pct(f.acc)} | ${pct(f.stated)} | ${pct(f.stated - f.acc)} | ${num(f.brier)} | ${num(f.ece)} |`,
    );
  }
  L.push("", "Positive gap = overconfident. `weak` labels are skipped packs Claude didn't read, which may still have been needed; read their row as an upper bound on precision, not as ground truth.", "");

  L.push("## Reliability (stated probability vs accuracy)", "");
  L.push("| stated | n | mean stated | accuracy | gap |");
  L.push("|---|---:|---:|---:|---:|");
  for (const b of bins(rows, "stated")) {
    L.push(`| ${b.lo.toFixed(2)}–${b.hi.toFixed(2)} | ${b.n} | ${pct(b.mean)} | ${pct(b.acc)} | ${pct(b.mean - b.acc)} |`);
  }
  L.push("");

  const withConf = rows.filter((r) => Number.isFinite(r.confidence));
  if (withConf.length) {
    L.push("## `confidence` field vs accuracy (Choice and Score)", "");
    L.push("Not a probability, so don't compare the numbers directly. Check that accuracy climbs as confidence does; if it doesn't, thresholds on `confidence` are not doing anything.", "");
    L.push("| confidence | n | accuracy |");
    L.push("|---|---:|---:|");
    for (const b of bins(withConf, "confidence", [0, 0.2, 0.4, 0.6, 0.8, 0.9, 1.0001])) {
      L.push(`| ${b.lo.toFixed(2)}–${b.hi.toFixed(2)} | ${b.n} | ${pct(b.acc)} |`);
    }
    L.push("");
  }

  const nouls = rows.filter((r) => r.type === "noul");
  if (nouls.length) {
    L.push("## Noul as an include gate", "");
    L.push("Include when p(yes) ≥ threshold. For context selection, pick the highest threshold whose recall you can live with: a missed pack fails silently.", "");
    for (const [, rs] of groupBy(nouls, (r) => `${r.family}|${r.label_quality}`)) {
      L.push(`**${rs[0].family}** · ${rs[0].label_quality} labels (n=${rs.length}, positives=${rs.filter((r) => r.key === 1).length})`, "");
      L.push("| threshold | recall | precision | share selected |");
      L.push("|---:|---:|---:|---:|");
      for (const t of thresholds(rs)) {
        L.push(`| ${t.t} | ${pct(t.recall)} | ${pct(t.precision)} | ${pct(t.selected)} |`);
      }
      L.push("");
    }
  }

  const scores = rows.filter((r) => r.type === "score");
  if (scores.length) {
    L.push(`Score mean absolute error (probability-weighted \`score\` vs true level): ${num(mean(scores.map((r) => r.absError)), 2)} levels.`, "");
  }

  L.push("## What this does not show", "");
  L.push("- **Computed families are mechanical.** They test calibration where truth is unambiguous. Judgment-shaped routing decisions are only covered by `hand`, `miss`, and `weak` rows, and only as well as those labels.");
  L.push("- **One prompt wording per family.** Jev's answers move with how a question is phrased; a different wording is a different measurement.");
  L.push("- **One model version.** An alias like `jev-latest` can move under you. Re-run before trusting thresholds tuned on an older version.");
  L.push("");
  return L.join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const paths = process.argv.slice(2);
  if (!paths.length) {
    console.error("usage: score.mjs results.jsonl... > report.md");
    process.exit(2);
  }
  const { rows, errors } = load(paths);
  if (!rows.length) {
    console.error("score.mjs: no successful results to score");
    process.exit(1);
  }
  process.stdout.write(report(rows, { errors }));
}
