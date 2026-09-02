/**
 * Builds one example, serves it, and asks assert-render.mjs whether it renders.
 *
 * The assertion existed for a year and no CI ran it. `examples.json` carried a
 * per-example answer - `assertRender` paths, or a `buildOnly` marker naming the
 * debt - and every workflow ignored the file, so three examples were "asserted"
 * by a measurement somebody took by hand, once. This script is what makes the
 * file true: it is the only reader of `build`, `start`, `port` and
 * `assertRender`, and each workflow calls it with a directory name.
 *
 * One script rather than the same twenty lines pasted into four workflows -
 * four copies of a startup sequence is the drift these examples keep finding in
 * their own blocks, and a workflow is no better a place for it.
 *
 * Usage: node scripts/serve-and-assert.mjs <example-dir>
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const READY_TIMEOUT_MS = 120_000;
const READY_POLL_MS = 1000;

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/serve-and-assert.mjs <example-dir>");
  process.exit(1);
}

const examples = JSON.parse(
  readFileSync(resolve(REPO_ROOT, "examples.json"), "utf8"),
).examples;
const entry = examples.find((e) => e.dir === dir);

if (!entry) {
  console.error(
    `${dir}: no such entry in examples.json (have: ${examples
      .map((e) => e.dir)
      .join(", ")})`,
  );
  process.exit(1);
}

// A debt marker, and the one place that decides. A workflow calls this script
// unconditionally; the file says whether there is anything to assert yet.
if (entry.buildOnly) {
  console.log(`${dir}: marked buildOnly in examples.json, nothing to assert`);
  if (entry.buildOnlyReason) console.log(`  reason: ${entry.buildOnlyReason}`);
  process.exit(0);
}

for (const field of ["build", "start", "port"]) {
  if (!entry[field]) {
    console.error(`${dir}: examples.json entry has no \`${field}\``);
    process.exit(1);
  }
}
if (!entry.assertRender?.length) {
  console.error(
    `${dir}: examples.json entry has neither \`assertRender\` paths nor \`buildOnly\` - one of the two has to say what CI should do`,
  );
  process.exit(1);
}

const cwd = resolve(REPO_ROOT, dir);
const baseUrl = `http://localhost:${entry.port}`;

function run(command, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: "inherit",
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolvePromise()
        : reject(new Error(`\`${command}\` exited with ${code}`)),
    );
  });
}

console.log(`${dir}: ${entry.build}`);
await run(entry.build);

// PORT so the port in examples.json is the one the server listens on rather
// than a note about the framework's default: next start, react-router-serve and
// the astro node entry all read it.
const server = spawn(entry.start, {
  cwd,
  shell: true,
  env: { ...process.env, PORT: String(entry.port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
const collect = (chunk) => {
  serverOutput += chunk;
};
server.stdout.on("data", collect);
server.stderr.on("data", collect);

let serverExited = false;
server.on("exit", (code) => {
  serverExited = true;
  if (code !== 0) serverOutput += `\n[server exited with ${code}]`;
});

function stopServer() {
  if (!serverExited) server.kill("SIGTERM");
}

async function waitForReady() {
  const probe = new URL(entry.assertRender[0], baseUrl).toString();
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (serverExited) {
      throw new Error(
        `\`${entry.start}\` exited before it served anything:\n${serverOutput}`,
      );
    }
    try {
      const res = await fetch(probe, { redirect: "follow" });
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, READY_POLL_MS));
  }
  throw new Error(
    `${dir} never answered on ${probe} within ${READY_TIMEOUT_MS / 1000}s:\n${serverOutput}`,
  );
}

try {
  await waitForReady();
  console.log(`${dir}: serving on ${baseUrl}`);
  await run(
    [
      "node",
      JSON.stringify(resolve(REPO_ROOT, "scripts/assert-render.mjs")),
      JSON.stringify(baseUrl),
      ...entry.assertRender.map((p) => JSON.stringify(p)),
    ].join(" "),
    { cwd: REPO_ROOT },
  );
} catch (error) {
  console.error(`\n${error.message}`);
  stopServer();
  process.exit(1);
}

stopServer();
