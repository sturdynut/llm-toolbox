import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { execFileSync, spawnSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { decide } from "../hooks/context-select.mjs";
import { noteMiss } from "../hooks/note-miss.mjs";
import { harvest } from "../calibrate/harvest.mjs";
import { readRecent, readSessionState } from "../lib/session.mjs";
import { parsePack } from "../lib/packs.mjs";
import { readJsonl } from "../calibrate/run.mjs";
import { startStub } from "./stub.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function project(packs) {
  const cwd = mkdtempSync(join(tmpdir(), "jev-proj-"));
  const dir = join(cwd, ".claude", "context-packs");
  mkdirSync(dir, { recursive: true });
  for (const [name, { description, body, always }] of Object.entries(packs)) {
    const fm = [`description: ${description}`, always ? "always: true" : null].filter(Boolean).join("\n");
    writeFileSync(join(dir, `${name}.md`), `---\n${fm}\n---\n${body}\n`);
  }
  return cwd;
}

const PACKS = {
  deploy: { description: "Deploy runbook", body: "DEPLOY-BODY" },
  billing: { description: "Billing rules", body: "BILLING-BODY" },
  style: { description: "Code style", body: "STYLE-BODY", always: true },
};

// Answers keyed by pack name, read back out of the structured instructions.
const clientFor = (pByName) => async ({ questions }) => ({
  model: "fake",
  answers: Object.fromEntries(
    Object.entries(questions).map(([id, q]) => [id, { type: "noul", noul: pByName[q.instructions.pack.name] }]),
  ),
});

beforeEach(() => {
  process.env.JEV_ROUTER_LOG_DIR = mkdtempSync(join(tmpdir(), "jev-log-"));
  for (const k of ["JEV_ROUTER_THRESHOLD", "JEV_ROUTER_MAX_CHARS", "JEV_ROUTER_PACKS"]) delete process.env[k];
});

test("no packs: inert", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "jev-empty-"));
  assert.equal(await decide({ cwd, prompt: "hi" }, { client: clientFor({}) }), null);
});

test("selects at the threshold, always-packs skip Jev, skipped packs are listed with paths", async () => {
  const cwd = project(PACKS);
  let asked;
  const out = await decide(
    { cwd, prompt: "ship it" },
    { client: async (req) => ((asked = req), clientFor({ deploy: 0.2, billing: 0.19 })(req)) },
  );
  assert.equal(Object.keys(asked.questions).length, 2, "always-pack is not sent to Jev");
  assert.deepEqual(out.included.map((s) => s.pack.name).sort(), ["deploy", "style"]);
  assert.match(out.context, /DEPLOY-BODY/);
  assert.match(out.context, /STYLE-BODY/);
  assert.doesNotMatch(out.context, /BILLING-BODY/);
  assert.match(out.context, /billing: Billing rules \(.*billing\.md\)/);
});

test("budget keeps the highest-p packs and reports the rest as over-budget", async () => {
  process.env.JEV_ROUTER_MAX_CHARS = String("STYLE-BODY".length + "DEPLOY-BODY".length);
  const cwd = project(PACKS);
  const out = await decide({ cwd, prompt: "x" }, { client: clientFor({ deploy: 0.9, billing: 0.5 }) });
  assert.deepEqual(out.included.map((s) => s.pack.name), ["style", "deploy"]);
  assert.equal(out.skipped[0].reason, "over-budget");
});

test("Jev down: fail open, include everything, and say so", async () => {
  const cwd = project(PACKS);
  const out = await decide({ cwd, prompt: "x" }, { client: async () => { throw new Error("HTTP 529"); } });
  assert.equal(out.included.length, 3);
  assert.match(out.context, /selection was unavailable: HTTP 529/);
  assert.equal(out.record.error, "HTTP 529");
});

test("a malformed answer for one pack fails open for that pack only", async () => {
  const cwd = project(PACKS);
  const out = await decide({ cwd, prompt: "x" }, { client: clientFor({ deploy: 0.01 /* billing missing */ }) });
  const byName = Object.fromEntries(out.record.packs.map((p) => [p.name, p]));
  assert.equal(byName.billing.reason, "fail-open");
  assert.equal(byName.deploy.reason, "below-threshold");
});

test("recent conversation drops harness noise and the current prompt", () => {
  const dir = mkdtempSync(join(tmpdir(), "jev-tx-"));
  const tx = join(dir, "t.jsonl");
  const lines = [
    { type: "user", message: { content: "<local-command-caveat>Caveat: ...</local-command-caveat>" } },
    { type: "user", message: { content: "Should we split the router?" } },
    { type: "assistant", message: { content: [{ type: "text", text: "Yes, into two hooks." }, { type: "tool_use", name: "Read" }] } },
    { type: "user", message: { content: [{ type: "tool_result", content: "file text" }] } },
    { type: "user", message: { content: "go for it" } },
  ];
  writeFileSync(tx, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  assert.deepEqual(readRecent(tx), [
    { role: "user", text: "Should we split the router?" },
    { role: "assistant", text: "Yes, into two hooks." },
    { role: "user", text: "go for it" },
  ]);
});

test("pack frontmatter parsing", () => {
  const p = parsePack("/x/a.md", '---\ndescription: "Has: colons"\nalways: true\n---\nBody\n');
  assert.equal(p.description, "Has: colons");
  assert.equal(p.always, true);
  assert.equal(p.body, "Body");
});

test("end to end: hook process against the stub, then a miss, then harvest", async () => {
  const cwd = project(PACKS);
  const stub = await startStub({
    answer: (q) => ({ type: "noul", noul: q.instructions.pack.name === "deploy" ? 0.95 : 0.03 }),
  });
  try {
    const env = { ...process.env, TYPESAFE_API_KEY: "test-key", TYPESAFE_BASE_URL: stub.url };
    const input = { session_id: "s1", cwd, prompt: "roll back the release", hook_event_name: "UserPromptSubmit" };
    // Async spawn, not spawnSync: the stub runs on this process's event loop.
    const run = await new Promise((resolve) => {
      const child = spawn("node", [join(root, "hooks/context-select.mjs")], { env });
      let out = "";
      child.stdout.on("data", (d) => (out += d));
      child.on("close", (code) => resolve({ code, out }));
      child.stdin.end(JSON.stringify(input));
    });
    assert.equal(run.code, 0);
    const parsed = JSON.parse(run.out);
    assert.equal(parsed.hookSpecificOutput.hookEventName, "UserPromptSubmit");
    assert.match(parsed.hookSpecificOutput.additionalContext, /DEPLOY-BODY/);
    assert.equal(stub.requests[0].state.prompt, "roll back the release");

    // Claude reads the skipped billing pack: one miss, counted once.
    const billing = join(cwd, ".claude/context-packs/billing.md");
    const miss = noteMiss({ session_id: "s1", tool_name: "Read", tool_input: { file_path: billing }, cwd });
    assert.equal(miss.pack, "billing");
    assert.equal(noteMiss({ session_id: "s1", tool_name: "Read", tool_input: { file_path: billing }, cwd }), null);
    assert.equal(noteMiss({ session_id: "s1", tool_name: "Read", tool_input: { file_path: join(cwd, "README.md") }, cwd }), null);
    assert.equal(readSessionState("s1").skipped.length, 0);

    const items = harvest(readJsonl(join(process.env.JEV_ROUTER_LOG_DIR, "decisions.jsonl")));
    assert.deepEqual(
      items.map((i) => [i.question.instructions.pack.name, i.label_quality, i.key]),
      [["billing", "miss", 1]],
      "deploy was included (no label); billing was skipped then read (miss)",
    );
  } finally {
    await stub.close();
  }
});

test("hook with no API key still injects packs (fail open) and exits 0", () => {
  const cwd = project(PACKS);
  const env = { ...process.env, TYPESAFE_API_KEY: "" };
  const r = spawnSync("node", [join(root, "hooks/context-select.mjs")], {
    env,
    input: JSON.stringify({ session_id: "s2", cwd, prompt: "x" }),
  });
  assert.equal(r.status, 0);
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /TYPESAFE_API_KEY is not set/);
});

test("JEV_ROUTER_OFF=1 prints nothing", () => {
  const cwd = project(PACKS);
  const out = execFileSync("node", [join(root, "hooks/context-select.mjs")], {
    env: { ...process.env, JEV_ROUTER_OFF: "1" },
    input: JSON.stringify({ cwd, prompt: "x" }),
  });
  assert.equal(out.toString(), "");
});

test("hooks.json references scripts that exist via CLAUDE_PLUGIN_ROOT", () => {
  const cfg = JSON.parse(readFileSync(join(root, "hooks/hooks.json"), "utf8"));
  const cmds = Object.values(cfg.hooks).flat().flatMap((m) => m.hooks.map((h) => h.command));
  for (const c of cmds) {
    assert.match(c, /\$\{CLAUDE_PLUGIN_ROOT\}/);
    const rel = c.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)/)[1];
    readFileSync(join(root, rel));
  }
});
