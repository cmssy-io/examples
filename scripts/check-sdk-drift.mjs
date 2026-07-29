/**
 * Reports examples whose locked @cmssy version is a minor or major behind npm.
 *
 * A patch behind is fine - an example demonstrates a released version, not the
 * tip. A minor behind is how astro-storefront and remix-storefront reached two
 * majors behind while every build stayed green: the caret in package.json never
 * applies, because deployments install from the lockfile.
 *
 * Exit codes are three-valued on purpose. A caller that cannot tell "behind"
 * from "the registry was unreachable" will bump on an outage.
 *
 *   0  every example is current    1  something is behind    2  the check failed
 *
 * Usage: node scripts/check-sdk-drift.mjs [--json]
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const LOCKED = /'?@cmssy\/([a-z-]+)@(\d+)\.(\d+)\.(\d+)/g;
const OFF_TRACK = new Set(["types"]);
const asJson = process.argv.includes("--json");

function seriesOf(version) {
  const [major, minor] = version.split(".");
  return `${major}.${minor}`;
}

function compare(a, b) {
  const [am, an, ap] = a.split(".").map(Number);
  const [bm, bn, bp] = b.split(".").map(Number);
  return am - bm || an - bn || ap - bp;
}

async function latestOf(name) {
  const res = await fetch(`https://registry.npmjs.org/@cmssy/${name}/latest`);
  if (!res.ok) throw new Error(`npm returned ${res.status} for @cmssy/${name}`);
  const { version } = await res.json();
  if (!version) throw new Error(`npm returned no version for @cmssy/${name}`);
  return version;
}

async function findDrift() {
  const manifest = JSON.parse(readFileSync("examples.json", "utf8"));
  const latest = new Map();
  const findings = [];

  for (const example of manifest.examples) {
    const lock = readFileSync(join(example.dir, "pnpm-lock.yaml"), "utf8");
    const locked = new Map();

    for (const [, name, major, minor, patch] of lock.matchAll(LOCKED)) {
      if (OFF_TRACK.has(name)) continue;
      const version = `${major}.${minor}.${patch}`;
      const seen = locked.get(name);
      if (!seen || compare(version, seen) > 0) locked.set(name, version);
    }

    for (const [name, version] of locked) {
      if (!latest.has(name)) latest.set(name, await latestOf(name));
      const published = latest.get(name);
      if (
        compare(version, published) < 0 &&
        seriesOf(version) !== seriesOf(published)
      ) {
        findings.push({
          dir: example.dir,
          package: `@cmssy/${name}`,
          locked: version,
          latest: published,
        });
      }
    }
  }

  return findings;
}

let findings;
try {
  findings = await findDrift();
} catch (error) {
  console.error(`Drift check failed: ${error.message}`);
  process.exit(2);
}

if (asJson) {
  console.log(JSON.stringify(findings, null, 2));
} else if (findings.length === 0) {
  console.log("Every example is on the current @cmssy minor.");
} else {
  console.error("Examples behind the published @cmssy minor:\n");
  for (const f of findings) {
    console.error(`  ${f.dir}: ${f.package} ${f.locked} -> ${f.latest}`);
  }
}

process.exit(findings.length === 0 ? 0 : 1);
