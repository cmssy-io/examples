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

// `args` omitted means the command is a shell line from examples.json; passing
// args means an argv, and no shell gets to reinterpret what is in them.
function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args ?? [], {
      cwd,
      shell: args === undefined,
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
//
// `detached` puts the shell and everything it spawns in one process group, so
// the kill below reaches the server itself. Signalling the shell alone can
// leave the node process holding the port: the step then hangs, or the next
// example finds the port taken and asserts against the wrong app.
const server = spawn(entry.start, {
  cwd,
  shell: true,
  detached: true,
  // CMSSY_SITE_URL because sitemap.xml and robots.txt refuse to guess their own
  // origin - taking it from the request would let a client's Host header decide
  // what the site publishes about itself. Under CI there is no real origin to
  // give them, so the one we are about to fetch is the truthful answer.
  env: {
    CMSSY_SITE_URL: baseUrl,
    ...process.env,
    PORT: String(entry.port),
  },
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
server.on("error", (error) => {
  serverExited = true;
  serverOutput += `\n[\`${entry.start}\` could not be spawned: ${error.message}]`;
});

function stopServer() {
  if (serverExited || server.pid === undefined) return;
  try {
    // Negative pid: the whole process group from `detached` above, not just the
    // shell that happens to sit at the top of it.
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // Already gone, or the group went with it.
  }
}

// An `assertRender` item is a path, or an object carrying that path plus what
// else must be true of it. Only the path is any of this script's business.
function pathOf(target) {
  return typeof target === "string" ? target : target.path;
}

// A target that is meant to answer 404 would never satisfy the readiness poll,
// so the probe is the first one that expects a 200.
const readyTarget =
  entry.assertRender.find(
    (target) => typeof target === "string" || (target.status ?? 200) === 200,
  ) ?? entry.assertRender[0];

async function waitForReady() {
  const probe = new URL(pathOf(readyTarget), baseUrl).toString();
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (serverExited) {
      throw new Error(
        `\`${entry.start}\` exited before it served anything:\n${serverOutput}`,
      );
    }
    try {
      const res = await fetch(probe, { redirect: "follow" });
      // Undici holds the socket until the body is read or cancelled, and a slow
      // boot polls this a hundred times over the deadline below.
      await res.body?.cancel();
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
    "node",
    [
      resolve(REPO_ROOT, "scripts/assert-render.mjs"),
      baseUrl,
      ...entry.assertRender.map((target) => JSON.stringify(target)),
    ],
    { cwd: REPO_ROOT },
  );
  if (entry.assertSitemap) {
    await run(
      "node",
      [
        resolve(REPO_ROOT, "scripts/assert-sitemap.mjs"),
        baseUrl,
        typeof entry.assertSitemap === "string"
          ? entry.assertSitemap
          : "/sitemap.xml",
        // Only the URLs that are meant to exist: a path asserted to 404 is one
        // the sitemap had better not be listing.
        ...entry.assertRender
          .filter(
            (target) =>
              typeof target === "string" || (target.status ?? 200) === 200,
          )
          .map(pathOf),
      ],
      { cwd: REPO_ROOT },
    );
  }
} catch (error) {
  console.error(`\n${error.message}`);
  stopServer();
  process.exit(1);
}

stopServer();
