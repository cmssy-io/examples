import { checkCmssyEditMode } from "@cmssy/next/testing";
import { existsSync, readFileSync } from "node:fs";

// Both, in that order: `.env` holds the workspace slugs a checkout shares, and
// `.env.local` the secret it does not. Reading only one silently loses half the
// credentials, which lands in exactly the missing-variable case below.
for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(
      line,
    );
    if (!match) continue;
    // Balanced quotes only: stripping one lone quote turns a valid secret into
    // an invalid one and the failure blames the edit route instead.
    const raw = match[2].trim();
    const value = /^(["'])(.*)\1$/.exec(raw);
    process.env[match[1]] = value ? value[2] : raw;
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
