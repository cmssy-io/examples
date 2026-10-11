import { appendFileSync } from "node:fs";

const logPath = process.env.DELIVERY_FETCH_LOG;
const original = globalThis.fetch;

function urlOf(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input?.url ?? "";
}

function operationOf(init) {
  if (typeof init?.body !== "string") return null;
  try {
    const body = JSON.parse(init.body);
    if (typeof body.operationName === "string") return body.operationName;
    const match = /^\s*(?:query|mutation)\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(
      body.query ?? "",
    );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function record(url, init, res) {
  if (!logPath || !url.includes("/public/")) return;
  const line = {
    t: Date.now(),
    pid: process.pid,
    path: new URL(url).pathname,
    op: operationOf(init),
    status: res.status,
    remaining: res.headers.get("x-ratelimit-remaining"),
    reset: res.headers.get("x-ratelimit-reset"),
    scope: res.headers.get("x-ratelimit-scope"),
    retryAfter: res.headers.get("retry-after"),
  };
  try {
    appendFileSync(logPath, `${JSON.stringify(line)}\n`);
  } catch {
    return;
  }
}

if (typeof original === "function" && logPath) {
  const logged = async function fetch(input, init) {
    const res = await original.call(this, input, init);
    record(urlOf(input), init, res);
    return res;
  };
  globalThis.fetch = logged;
}
