import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PRELOAD = pathToFileURL(
  resolve(REPO_ROOT, "scripts/delivery-fetch-log.mjs"),
).href;
const DEFAULT_API_URL = "https://api.cmssy.io/graphql";
const READY_TIMEOUT_MS = 240_000;
const READY_POLL_MS = 500;
const QUIET_MS = 2_000;
const QUIET_CAP_MS = 30_000;
const DEFAULT_RETRY_AFTER_S = 60;
const WINDOW_S = 60;
const WINDOW_MARGIN_MS = 1_500;
const SITE_CONFIG_QUERY = `query ($workspaceSlug: String!) {
  public { siteConfig(workspaceSlug: $workspaceSlug) { workspaceId } }
}`;

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const dir = args.find((arg) => !arg.startsWith("--"));
if (!dir) {
  console.error(
    "usage: node scripts/measure-delivery-cost.mjs <example-dir> [--skip-build]",
  );
  process.exit(1);
}

const org = process.env.CMSSY_ORG_SLUG;
const workspaceSlug = process.env.CMSSY_WORKSPACE_SLUG;
if (!org || !workspaceSlug) {
  console.error("CMSSY_ORG_SLUG and CMSSY_WORKSPACE_SLUG are required");
  process.exit(1);
}

const examples = JSON.parse(
  readFileSync(resolve(REPO_ROOT, "examples.json"), "utf8"),
).examples;
const entry = examples.find((example) => example.dir === dir);
if (!entry) {
  console.error(`${dir}: no such entry in examples.json`);
  process.exit(1);
}
for (const field of ["build", "start", "port"]) {
  if (!entry[field]) {
    console.error(`${dir}: examples.json entry has no \`${field}\``);
    process.exit(1);
  }
}

const cwd = resolve(REPO_ROOT, dir);
const baseUrl = `http://localhost:${entry.port}`;
const apiBase = (process.env.CMSSY_API_URL?.trim() || DEFAULT_API_URL).replace(
  /\/graphql\/?$/,
  "",
);
const deliveryUrl = `${apiBase}/public/${org}/${workspaceSlug}/graphql`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function textLength(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

function budgetOf(res) {
  return {
    remaining: Number(res.headers.get("x-ratelimit-remaining")),
    reset: res.headers.get("x-ratelimit-reset"),
    scope: res.headers.get("x-ratelimit-scope"),
    retryAfter: res.headers.get("retry-after"),
  };
}

async function delivery(query, variables) {
  for (;;) {
    const res = await fetch(deliveryUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const budget = budgetOf(res);
    if (res.status === 429) {
      const wait = Number(budget.retryAfter) || DEFAULT_RETRY_AFTER_S;
      console.log(
        `delivery answered 429 while picking slugs - waiting ${wait}s`,
      );
      await res.body?.cancel();
      await sleep(wait * 1000);
      continue;
    }
    const json = await res.json();
    if (!res.ok || json.errors?.length) {
      throw new Error(
        `delivery ${res.status}: ${JSON.stringify(json.errors ?? json)}`,
      );
    }
    return { data: json.data, budget };
  }
}

async function pickSlugs() {
  const site = await delivery(SITE_CONFIG_QUERY, { workspaceSlug });
  const workspaceId = site.data.public?.siteConfig?.workspaceId;
  if (!workspaceId) throw new Error(`no workspaceId for ${workspaceSlug}`);

  const catalog = await delivery(
    `query ($workspaceId: String!) {
      public {
        model {
          categories: records(workspaceId: $workspaceId, modelSlug: "category", limit: 50) {
            items { data }
          }
          products: records(workspaceId: $workspaceId, modelSlug: "product", limit: 1) {
            items { data }
          }
        }
      }
    }`,
    { workspaceId },
  );
  const model = catalog.data.public?.model;
  const category = (model?.categories?.items ?? [])
    .map((item) => item.data?.slug)
    .find((slug) => typeof slug === "string" && slug.length > 0);
  const product = model?.products?.items?.[0]?.data?.slug;
  if (!category || !product) {
    throw new Error(
      `could not pick slugs: category=${category ?? "-"} product=${product ?? "-"}`,
    );
  }
  return { category, product, budget: catalog.budget };
}

function run(command) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, [], { cwd, shell: true, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolvePromise()
        : reject(new Error(`\`${command}\` exited with ${code}`)),
    );
  });
}

function readLog(logPath) {
  let raw = "";
  try {
    raw = readFileSync(logPath, "utf8");
  } catch {
    return [];
  }
  return raw
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

function hostListening(port, host) {
  return new Promise((resolvePromise) => {
    const socket = connect({ port, host });
    socket.once("connect", () => {
      socket.destroy();
      resolvePromise(true);
    });
    socket.once("error", () => resolvePromise(false));
  });
}

async function portListening(port) {
  for (const host of ["127.0.0.1", "::1"]) {
    if (await hostListening(port, host)) return true;
  }
  return false;
}

async function quietBaseline(reason, knownReset) {
  const probe = await delivery(SITE_CONFIG_QUERY, { workspaceSlug });
  const lastReset = Math.max(knownReset, Number(probe.budget.reset) || 0);
  const target = (lastReset + WINDOW_S) * 1000 + WINDOW_MARGIN_MS;
  const wait = Math.max(0, target - Date.now());
  console.log(
    `${reason} - waiting ${Math.ceil(wait / 1000)}s for a delivery window whose previous window is empty`,
  );
  await sleep(wait);
  for (;;) {
    const { budget } = await delivery(SITE_CONFIG_QUERY, { workspaceSlug });
    if (Number(budget.reset) >= lastReset + 2 * WINDOW_S) return budget;
    await sleep(WINDOW_MARGIN_MS);
  }
}

function lastResetIn(lines, fallback) {
  return Math.max(fallback, ...lines.map((line) => Number(line.reset) || 0));
}

async function quiesce(logPath, since) {
  const started = Date.now();
  let count = readLog(logPath).length;
  let quietSince = Date.now();
  while (Date.now() - started < QUIET_CAP_MS) {
    await sleep(250);
    const now = readLog(logPath).length;
    if (now !== count) {
      count = now;
      quietSince = Date.now();
    } else if (Date.now() - quietSince >= QUIET_MS) {
      break;
    }
  }
  return readLog(logPath).slice(since);
}

function remainingOf(line) {
  if (line?.remaining === null || line?.remaining === undefined) return null;
  const value = Number(line.remaining);
  return line.remaining !== "" && Number.isFinite(value) ? value : null;
}

async function measurePage(path, logPath, before) {
  const since = readLog(logPath).length;
  const started = Date.now();
  const res = await fetch(new URL(path, baseUrl), { redirect: "follow" });
  const chars = textLength(await res.text());
  const lines = await quiesce(logPath, since);
  const remaining = lines.map(remainingOf).filter((value) => value !== null);
  const last = lines.at(-1);
  const scopes = new Set(lines.map((line) => line.scope).filter(Boolean));
  const throttled = lines.filter((line) => line.status === 429);
  const crossed = lines.some((line) => line.reset !== before.reset);
  const comparable =
    !crossed &&
    scopes.size <= 1 &&
    (scopes.size === 0 || scopes.has(before.scope));
  return {
    path,
    status: res.status,
    chars,
    ms: Date.now() - started,
    requests: lines.length,
    throttled: throttled.length,
    slots:
      lines.length === 0
        ? 0
        : comparable &&
            Number.isFinite(before.remaining) &&
            remaining.length > 0
          ? before.remaining - Math.min(...remaining)
          : null,
    slotsLast:
      lines.length === 0
        ? 0
        : comparable &&
            Number.isFinite(before.remaining) &&
            remainingOf(last) !== null
          ? before.remaining - remainingOf(last)
          : null,
    scope: [...scopes].join("+") || "-",
    unread: lines.length - remaining.length,
    crossed,
    lastReset: lastResetIn(lines, Number(before.reset) || 0),
    retryAfter: Math.max(
      0,
      ...throttled.map(
        (line) => Number(line.retryAfter) || DEFAULT_RETRY_AFTER_S,
      ),
    ),
    after:
      last && remaining.length > 0
        ? {
            remaining: Math.min(...remaining),
            scope: last.scope,
            reset: last.reset,
          }
        : before,
  };
}

function cell(value, width, right = false) {
  const text = String(value);
  return right ? text.padStart(width) : text.padEnd(width);
}

function printTable(rows, opened) {
  const widths = {
    page: Math.max(4, ...rows.map((row) => row.path.length)),
  };
  const header = [
    cell("page", widths.page),
    cell("status", 6),
    cell("chars", 6, true),
    cell("requests", 8, true),
    cell("429", 3, true),
    cell("slots", 5, true),
    cell("slots(last)", 11, true),
    cell("scope", 20),
    cell("note", 10),
  ].join("  ");
  console.log(
    `\n${dir} @ ${deliveryUrl} - window opened at ${opened.remaining} remaining (${opened.scope})`,
  );
  console.log(header);
  console.log("-".repeat(header.length));
  for (const row of rows) {
    const notes = [];
    if (row.crossed) notes.push("window crossed");
    if (row.scope.includes("+")) notes.push("scope changed");
    if (row.unread > 0) notes.push(`${row.unread} without budget headers`);
    if (row.retried) notes.push("retried");
    console.log(
      [
        cell(row.path, widths.page),
        cell(row.status, 6),
        cell(row.chars, 6, true),
        cell(row.requests, 8, true),
        cell(row.throttled, 3, true),
        cell(row.slots ?? "?", 5, true),
        cell(row.slotsLast ?? "?", 11, true),
        cell(row.scope, 20),
        cell(notes.join(", "), 10),
      ].join("  "),
    );
  }
  const totalRequests = rows.reduce((sum, row) => sum + row.requests, 0);
  const measured = rows.filter((row) => row.slots !== null);
  const totalSlots = measured.reduce((sum, row) => sum + row.slots, 0);
  const unmeasured = rows.length - measured.length;
  console.log(
    `total: ${totalRequests} requests, ${totalSlots} slots${unmeasured ? ` (${unmeasured} page(s) unmeasured, not summed)` : ""}`,
  );
  console.log(
    `pages ran in this order in one process: ${rows.map((row) => row.path).join(", ")} - a page after the first reads what the earlier ones cached, so its cost is marginal; a cold process pays the catalogue scan on whichever catalogue page comes first.`,
  );
}

const slugs = await pickSlugs();
console.log(
  `${dir}: category "${slugs.category}", product "${slugs.product}", budget ${slugs.budget.remaining} remaining (${slugs.budget.scope})`,
);

if (!skipBuild) {
  console.log(`${dir}: ${entry.build}`);
  await run(entry.build);
}

const logDir = mkdtempSync(join(tmpdir(), "delivery-cost-"));
const logPath = join(logDir, "fetch.log");
writeFileSync(logPath, "");

const nodeOptions = [process.env.NODE_OPTIONS, `--import ${PRELOAD}`]
  .filter(Boolean)
  .join(" ");

const server = spawn(entry.start, {
  cwd,
  shell: true,
  detached: true,
  env: {
    CMSSY_SITE_URL: baseUrl,
    ...process.env,
    PORT: String(entry.port),
    NODE_OPTIONS: nodeOptions,
    DELIVERY_FETCH_LOG: logPath,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
let serverExited = false;
server.stdout.on("data", (chunk) => {
  serverOutput += chunk;
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk;
});
server.on("exit", () => {
  serverExited = true;
});

function stopServer() {
  if (serverExited || server.pid === undefined) return;
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    return;
  }
}

async function waitForPort() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (serverExited)
      throw new Error(`\`${entry.start}\` exited before listening`);
    if (await portListening(entry.port)) return;
    await sleep(READY_POLL_MS);
  }
  throw new Error(`${dir} never listened on ${entry.port}`);
}

const pages = ["/", "/c/all", `/c/${slugs.category}`, `/p/${slugs.product}`];

try {
  await waitForPort();
  console.log(`${dir}: listening on ${baseUrl}, log ${logPath}`);
  const rows = [];
  let before = await quietBaseline(
    `${dir}: server up`,
    lastResetIn(readLog(logPath), Number(slugs.budget.reset) || 0),
  );
  const opened = before;
  for (const path of pages) {
    let row = await measurePage(path, logPath, before);
    if (row.throttled > 0 || row.status >= 500) {
      const wait = row.retryAfter || DEFAULT_RETRY_AFTER_S;
      console.log(
        `${path}: ${row.throttled} x 429 (status ${row.status}) - waiting ${wait}s, then once more`,
      );
      await sleep(wait * 1000);
      before = await quietBaseline(`${path}: retrying`, row.lastReset);
      const again = await measurePage(path, logPath, before);
      row = {
        ...again,
        retried: true,
        throttled: row.throttled + again.throttled,
      };
    }
    rows.push(row);
    before = row.after;
    console.log(
      `${path}: HTTP ${row.status}, ${row.chars} chars in ${row.ms}ms, ${row.requests} delivery requests, ${row.slots ?? "?"} slots`,
    );
  }
  printTable(rows, opened);
} catch (error) {
  console.error(`\n${error.message}`);
  const written = serverOutput.trim();
  if (written) console.error(`\nWhat ${entry.start} wrote:\n${written}`);
  stopServer();
  process.exit(1);
}

stopServer();
