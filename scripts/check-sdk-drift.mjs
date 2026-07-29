/**
 * Reports examples whose locked @cmssy version is a minor or major behind npm.
 *
 * A patch behind is fine - an example demonstrates a released version, not the
 * tip. A minor behind is how astro-storefront and remix-storefront reached two
 * majors behind while every build stayed green: the caret in package.json never
 * applies, because deployments install from the lockfile.
 *
 * Usage: node scripts/check-sdk-drift.mjs [--json]
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const LOCKED = /'?@cmssy\/([a-z-]+)@(\d+)\.(\d+)\.(\d+)/g;
const asJson = process.argv.includes("--json");

const manifest = JSON.parse(readFileSync("examples.json", "utf8"));

async function latestOf(name) {
  const res = await fetch(`https://registry.npmjs.org/@cmssy/${name}/latest`);
  if (!res.ok) throw new Error(`npm returned ${res.status} for @cmssy/${name}`);
  return (await res.json()).version;
}

const latest = new Map();

async function lookup(name) {
  if (!latest.has(name)) latest.set(name, await latestOf(name));
  return latest.get(name);
}

const findings = [];

for (const example of manifest.examples) {
  const lock = readFileSync(join(example.dir, "pnpm-lock.yaml"), "utf8");
  const locked = new Map();

  for (const [, name, major, minor, patch] of lock.matchAll(LOCKED)) {
    const version = `${major}.${minor}.${patch}`;
    const seen = locked.get(name);
    if (!seen || compare(version, seen) > 0) locked.set(name, version);
  }

  for (const [name, version] of locked) {
    const published = await lookup(name);
    if (seriesOf(version) !== seriesOf(published)) {
      findings.push({
        dir: example.dir,
        package: `@cmssy/${name}`,
        locked: version,
        latest: published,
      });
    }
  }
}

function seriesOf(version) {
  const [major, minor] = version.split(".");
  return `${major}.${minor}`;
}

function compare(a, b) {
  const [am, an, ap] = a.split(".").map(Number);
  const [bm, bn, bp] = b.split(".").map(Number);
  return am - bm || an - bn || ap - bp;
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
