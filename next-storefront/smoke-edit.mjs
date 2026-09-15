import { checkCmssyEditMode } from "@cmssy/next/testing";
import { loadEnvFiles } from "./lib/load-env-files.mjs";

loadEnvFiles();

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
