import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import { generate } from "../calibrate/gen-computed.mjs";
import { judge, ece, thresholds, load, report } from "../calibrate/score.mjs";
import { runItems, readJsonl } from "../calibrate/run.mjs";
import { seedItems } from "../calibrate/seed-routing.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "jev-router-"));

test("generation is deterministic per seed and differs across seeds", () => {
  assert.deepEqual(generate({ n: 6, seed: 3 }), generate({ n: 6, seed: 3 }));
  assert.notDeepEqual(generate({ n: 6, seed: 3 }), generate({ n: 6, seed: 4 }));
});

test("families are balanced so always-yes can't score well", () => {
  const items = generate({ n: 40, seed: 1 });
  for (const fam of ["dir_member", "scope_gate", "log_order"]) {
    const keys = items.filter((i) => i.family === fam).map((i) => i.key);
    assert.equal(keys.filter((k) => k === 1).length, 20, fam);
  }
  const largest = items.filter((i) => i.family === "largest").map((i) => i.key);
  assert.equal(new Set(largest).size, 4);
  const done = items.filter((i) => i.family === "count_done").map((i) => i.key);
  assert.deepEqual([...new Set(done)].sort(), [0, 1, 2, 3, 4]);
});

// Re-derive every key from the state by a second route, so a bug in a generator's
// key logic can't hide behind its own construction.
test("every computed key re-derives from its state", () => {
  for (const it of generate({ n: 40, seed: 7 })) {
    const s = it.state;
    let want;
    switch (it.family) {
      case "dir_member":
        want = s.files.some((f) => f.split("/").slice(0, 2).join("/") === "src/auth" && f.split("/").length > 2) ? 1 : 0;
        break;
      case "scope_gate": {
        const n = posix.normalize(s.tool_call.file_path);
        want = s.allowed_dirs.some((d) => n.split("/").slice(0, d.split("/").length).join("/") === d && n.length > d.length) ? 0 : 1;
        break;
      }
      case "log_order":
        want = s.log.slice(s.log.indexOf("INFO deploy started") + 1).some((l) => /^ERROR /.test(l)) ? 1 : 0;
        break;
      case "largest":
        want = Object.keys(s.values).reduce((a, b) => (s.values[b] > s.values[a] ? b : a));
        break;
      case "count_done":
        want = Math.min(4, s.tasks.reduce((n, t) => n + (t.done ? 1 : 0), 0));
        break;
    }
    assert.equal(it.key, want, it.id);
  }
});

test("largest never has a tie for first", () => {
  for (const it of generate({ n: 40, seed: 2 }).filter((i) => i.family === "largest")) {
    const v = Object.values(it.state.values).sort((a, b) => b - a);
    assert.ok(v[0] > v[1], it.id);
  }
});

test("judge: noul, choice and score", () => {
  assert.deepEqual(
    judge({ type: "noul", key: 0, answer: { noul: 0.8 } }),
    { stated: 0.8, correct: false, brier: 0.6400000000000001, pYes: 0.8 },
  );
  const c = judge({
    type: "choice",
    key: "b",
    answer: { choice: "a", probabilities: { a: 0.6, b: 0.4 }, confidence: 0.2 },
  });
  assert.equal(c.stated, 0.6);
  assert.equal(c.correct, false);
  assert.ok(Math.abs(c.brier - (0.36 + 0.36)) < 1e-12);
  const s = judge({
    type: "score",
    key: 2,
    answer: { score: 1.8, probabilities: { 0: 0, 1: 0.2, 2: 0.8 }, confidence: 0.7 },
  });
  assert.equal(s.correct, true);
  assert.ok(Math.abs(s.absError - 0.2) < 1e-12);
});

test("ece is zero when stated matches accuracy and large when it doesn't", () => {
  const calibrated = [
    ...Array(8).fill({ stated: 0.8, correct: true }),
    ...Array(2).fill({ stated: 0.8, correct: false }),
  ];
  assert.ok(Math.abs(ece(calibrated)) < 1e-12);
  // The newsletter's claim, as data: 83% stated, 19% right.
  const over = [...Array(19).fill({ stated: 0.83, correct: true }), ...Array(81).fill({ stated: 0.83, correct: false })];
  assert.ok(Math.abs(ece(over) - 0.64) < 1e-9);
});

test("thresholds trade recall for precision", () => {
  const rows = [
    { key: 1, pYes: 0.9 },
    { key: 1, pYes: 0.15 },
    { key: 0, pYes: 0.6 },
    { key: 0, pYes: 0.01 },
  ];
  const [t05, , t02, , t05b] = thresholds(rows, [0.05, 0.1, 0.2, 0.3, 0.5]);
  assert.equal(t05.recall, 1);
  assert.equal(t02.recall, 0.5);
  assert.equal(t05b.precision, 0.5);
});

test("runItems resumes, retries failures, and load keeps the latest success", async () => {
  const dir = tmp();
  const out = join(dir, "results.jsonl");
  const items = generate({ n: 2, seed: 1 });
  let fail = true;
  const client = async ({ questions }) => {
    if (fail) throw new Error("boom");
    return { model: "fake", answers: { q: questions.q.type === "noul" ? { type: "noul", noul: 0.7 } : fakeDist(questions.q) }, usage: {} };
  };
  let r = await runItems(items, { out, client, concurrency: 3 });
  assert.equal(r.failed, items.length);
  fail = false;
  r = await runItems(items, { out, client });
  assert.equal(r.ran, items.length);
  r = await runItems(items, { out, client });
  assert.equal(r.ran, 0, "second clean run has nothing to do");
  const { rows, errors } = load([out]);
  assert.equal(rows.length, items.length);
  assert.equal(errors, 0, "an error later fixed is not reported as failed");
  assert.match(report(rows), /# Jev calibration report/);
});

test("seed items use the hook's question wording and known pack names", () => {
  const items = seedItems();
  assert.ok(items.length > 0);
  assert.ok(items.every((i) => i.question.instructions.question.includes("`pack`")));
  assert.ok(items.some((i) => i.key === 1) && items.some((i) => i.key === 0));
});

test("readJsonl tolerates a missing file and blank lines", () => {
  const dir = tmp();
  assert.deepEqual(readJsonl(join(dir, "nope.jsonl")), []);
  writeFileSync(join(dir, "a.jsonl"), '{"a":1}\n\n{"a":2}\n');
  assert.equal(readJsonl(join(dir, "a.jsonl")).length, 2);
});

function fakeDist(q) {
  const keys = q.type === "choice" ? Object.keys(q.criteria) : q.criteria.map((_, i) => String(i));
  const probabilities = Object.fromEntries(keys.map((k, i) => [k, i === 0 ? 1 : 0]));
  return { type: q.type, probabilities, confidence: 1, choice: keys[0], score: 0 };
}
