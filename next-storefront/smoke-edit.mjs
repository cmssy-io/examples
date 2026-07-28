import { checkCmssyEditMode } from "@cmssy/next/testing";
import { existsSync, readFileSync } from "node:fs";

// `.env.local` wins where it exists; a checkout that keeps its credentials in
// `.env` is just as valid, and reading only the first one made this script
// crash before it could check anything.
const envFile = [".env.local", ".env"].find(existsSync);
if (!envFile) {
  console.error("smoke:edit needs .env.local or .env - neither is present");
  process.exit(1);
}
for (const line of readFileSync(envFile, "utf8").split("\n")) {
  const [k, ...v] = line.split("=");
  if (k && !k.startsWith("#"))
    process.env[k.trim()] = v.join("=").trim().replace(/^"|"$/g, "");
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
