import { test } from "node:test";
import assert from "node:assert/strict";
import { systemOne, JevError } from "../lib/jev.mjs";
import { startStub } from "./stub.mjs";

const q = { a: { type: "noul", instructions: "Is it urgent?" } };

test("returns parsed answers and sends the default model", async () => {
  const stub = await startStub();
  try {
    const res = await systemOne({ state: "x", questions: q }, { apiKey: "test-key", baseUrl: stub.url });
    assert.equal(res.answers.a.noul, 0.9);
    assert.equal(stub.requests[0].model, "jev-latest");
  } finally {
    await stub.close();
  }
});

test("retries 429 and 529, then succeeds", async () => {
  for (const failStatus of [429, 529]) {
    const stub = await startStub({ failFirst: 2, failStatus });
    try {
      const res = await systemOne({ state: "x", questions: q }, { apiKey: "test-key", baseUrl: stub.url });
      assert.equal(res.answers.a.noul, 0.9);
      assert.equal(stub.calls(), 3);
    } finally {
      await stub.close();
    }
  }
});

test("does not retry a 401", async () => {
  const stub = await startStub();
  try {
    await assert.rejects(
      systemOne({ state: "x", questions: q }, { apiKey: "wrong", baseUrl: stub.url }),
      (err) => err instanceof JevError && err.status === 401,
    );
    assert.equal(stub.calls(), 1);
  } finally {
    await stub.close();
  }
});

test("missing key fails fast without a request", async () => {
  await assert.rejects(systemOne({ state: "x", questions: q }, { apiKey: "" }), /TYPESAFE_API_KEY/);
});

test("retries stop at the overall deadline", async () => {
  const stub = await startStub({ failFirst: 100 });
  try {
    const t0 = Date.now();
    await assert.rejects(
      systemOne({ state: "x", questions: q }, { apiKey: "test-key", baseUrl: stub.url, timeoutMs: 600, retries: 10 }),
    );
    assert.ok(Date.now() - t0 < 1500, "deadline must bound total time, retries included");
  } finally {
    await stub.close();
  }
});
