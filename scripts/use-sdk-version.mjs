import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [dir, version] = process.argv.slice(2);
if (!dir || !version) {
  console.error(
    "usage: node scripts/use-sdk-version.mjs <example-dir> <version>",
  );
  process.exit(2);
}

const path = join(dir, "package.json");
const pkg = JSON.parse(readFileSync(path, "utf8"));
const changed = [];

for (const field of ["dependencies", "devDependencies"]) {
  const deps = pkg[field];
  if (!deps) continue;
  for (const name of Object.keys(deps)) {
    if (!name.startsWith("@cmssy/")) continue;
    if (deps[name] === version) continue;
    changed.push(`${name} ${deps[name]} -> ${version}`);
    deps[name] = version;
  }
}

if (changed.length === 0) {
  console.log(`${dir}: already on ${version}`);
  process.exit(0);
}

writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`${dir}:\n  ${changed.join("\n  ")}`);
