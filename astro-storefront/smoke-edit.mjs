import { checkCmssyEditMode } from "@cmssy/astro/testing";

const baseUrl = process.argv[2] ?? process.env.SMOKE_BASE_URL;
const secret = process.env.CMSSY_DRAFT_SECRET;

if (!baseUrl || !secret) {
  console.error("usage: SMOKE_BASE_URL=… CMSSY_DRAFT_SECRET=… node smoke-edit.mjs");
  process.exit(1);
}

const result = await checkCmssyEditMode({ baseUrl, secret });
console.log(`${baseUrl} → ${result.ok ? "EDITOR OK" : "EDITOR BROKEN"}`);
for (const failure of result.failures) console.log("   -", failure);
process.exit(result.ok ? 0 : 1);
