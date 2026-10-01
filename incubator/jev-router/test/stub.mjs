// A local stand-in for api.typesafe.ai: same route, auth check, and response shape,
// with scripted failures. Answers are a deterministic function of the question so
// tests can assert on them.

import { createServer } from "node:http";

export function startStub({ failFirst = 0, failStatus = 429, answer } = {}) {
  let calls = 0;
  const requests = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      calls++;
      if (req.url !== "/v1/systemone" || req.method !== "POST") {
        res.writeHead(404).end();
        return;
      }
      if (req.headers.authorization !== "Bearer test-key") {
        res.writeHead(401, { "content-type": "application/json" }).end('{"error":"bad key"}');
        return;
      }
      if (calls <= failFirst) {
        res.writeHead(failStatus, { "content-type": "application/json" }).end('{"error":"busy"}');
        return;
      }
      const parsed = JSON.parse(body);
      requests.push(parsed);
      const answers = {};
      for (const [id, q] of Object.entries(parsed.questions)) {
        answers[id] = answer ? answer(q, parsed.state, id) : defaultAnswer(q);
      }
      res
        .writeHead(200, { "content-type": "application/json" })
        .end(JSON.stringify({ model: "jev-stub-0.0.0", answers, usage: { input_tokens: 10, output_tokens: 1 } }));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        requests,
        calls: () => calls,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

function defaultAnswer(q) {
  if (q.type === "noul") return { type: "noul", noul: 0.9 };
  const keys = q.type === "choice" ? Object.keys(q.criteria) : q.criteria.map((_, i) => String(i));
  const probabilities = Object.fromEntries(keys.map((k, i) => [k, i === 0 ? 0.7 : 0.3 / (keys.length - 1)]));
  const base = { type: q.type, probabilities, confidence: 0.6 };
  return q.type === "choice"
    ? { ...base, choice: keys[0] }
    : { ...base, score: 0.5, legend: Object.fromEntries(q.criteria.map((c, i) => [String(i), c])) };
}
