// Minimal client for TypeSafe's System One endpoint (Jev). No SDK dependency, so the
// hooks run with nothing but `node`.
//
//   POST {base}/v1/systemone   Authorization: Bearer $TYPESAFE_API_KEY
//   { state, model, questions: { id: { type, instructions, criteria } } }
//   -> { model, answers: { id: {...} }, usage }
//
// Env:
//   TYPESAFE_API_KEY   required
//   TYPESAFE_BASE_URL  default https://api.typesafe.ai (tests point it at a stub)
//   JEV_MODEL          default jev-latest. Pin a versioned id (jev-1.13.0) once you
//                      have tuned thresholds against it: the alias moves on release.

export const DEFAULT_MODEL = "jev-latest";

export class JevError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "JevError";
    this.status = status;
    this.body = body;
  }
}

const RETRYABLE = new Set([429, 529, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function systemOne(
  { state, questions, model },
  {
    apiKey = process.env.TYPESAFE_API_KEY,
    baseUrl = process.env.TYPESAFE_BASE_URL || "https://api.typesafe.ai",
    timeoutMs = 10000,
    retries = 3,
  } = {},
) {
  if (!apiKey) throw new JevError("TYPESAFE_API_KEY is not set");
  const body = JSON.stringify({
    state,
    model: model || process.env.JEV_MODEL || DEFAULT_MODEL,
    questions,
  });

  // One deadline across all attempts: a hook has a hard timeout, and per-attempt
  // timeouts with backoff would let retries blow straight through it.
  const deadline = Date.now() + timeoutMs;
  for (let attempt = 0; ; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new JevError(`timed out after ${timeoutMs}ms`);
    let res;
    try {
      res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/systemone`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: AbortSignal.timeout(remaining),
      });
    } catch (err) {
      if (attempt < retries && Date.now() < deadline) {
        await sleep(Math.min(backoff(attempt), deadline - Date.now()));
        continue;
      }
      throw new JevError(`request failed: ${err.message}`);
    }

    const text = await res.text();
    if (res.ok) {
      try {
        return JSON.parse(text);
      } catch {
        throw new JevError("response was not JSON", { status: res.status, body: text });
      }
    }
    if (RETRYABLE.has(res.status) && attempt < retries) {
      const after = Number(res.headers.get("retry-after"));
      const wait = Number.isFinite(after) && after > 0 ? after * 1000 : backoff(attempt);
      if (Date.now() + wait < deadline) {
        await sleep(wait);
        continue;
      }
    }
    throw new JevError(`HTTP ${res.status}`, { status: res.status, body: text });
  }
}

function backoff(attempt) {
  return 250 * 2 ** attempt + Math.floor(Math.random() * 100);
}
