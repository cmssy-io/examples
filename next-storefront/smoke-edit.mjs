import { checkCmssyEditMode } from "@cmssy/next/testing";
import { existsSync, readFileSync } from "node:fs";

// Both files, `.env.local` last so it wins - a checkout may split the workspace
// slugs from the secret. Reading only one silently loses half the credentials.
for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  // `\r?\n`, because `.` does not match `\r` and `$` without /m anchors at the
  // end of input: on a CRLF file a `\n`-only split matches no line at all.
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(
      line,
    );
    if (!match) continue;
    // A real environment variable wins over the file, the way every other
    // dotenv loader works - otherwise CI cannot override what a checkout has.
    const [, name, rest] = match;
    if (process.env[name]) continue;
    // Balanced quotes only: stripping one lone quote turns a valid secret into
    // an invalid one, and the failure then blames the edit route instead.
    const raw = rest.trim();
    const quoted = /^(["'])(.*)\1$/.exec(raw);
    process.env[name] = quoted ? quoted[2] : raw;
  }
}

// `checkCmssyEditMode` treats an unreachable workspace as "nothing to compare"
// and skips the layout assertions, so a missing slug would print EDITOR OK -
// the silent pass this check exists to make impossible.
const required = ["CMSSY_DRAFT_SECRET", "CMSSY_ORG_SLUG", "CMSSY_WORKSPACE_SLUG"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(`smoke:edit cannot run: ${missing.join(", ")} not set`);
  console.error("  set them in .env / .env.local, or export them");
  process.exit(1);
}

const result = await checkCmssyEditMode({
  baseUrl: process.env.SMOKE_BASE_URL ?? "http://localhost:3312",
  secret: process.env.CMSSY_DRAFT_SECRET,
  path: "/",
  localizedPath: "/no",
  // Without this the check cannot tell "this app renders no header" from "this
  // workspace has no header configured", and stays green either way.
  workspace: {
    org: process.env.CMSSY_ORG_SLUG,
    workspaceSlug: process.env.CMSSY_WORKSPACE_SLUG,
  },
});

console.log(result.ok ? "EDITOR OK" : "EDITOR BROKEN");
for (const f of result.failures) console.log("  -", f);
process.exit(result.ok ? 0 : 1);
