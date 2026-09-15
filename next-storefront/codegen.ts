import type { CodegenConfig } from "@graphql-codegen/cli";
import { loadEnvFiles } from "./lib/load-env-files.mjs";

loadEnvFiles();

// This app talks to the org-scoped delivery endpoint, and delivery serves a
// narrower schema than the admin API: ~94 types against 436. Typing against
// admin would compile a query this storefront is not allowed to send, and the
// refusal would land in production instead of here.
//
// CODEGEN_SCHEMA overrides it with a file, which is how cmssy's schema gate
// checks a *proposed* schema before it merges.
function deliverySchemaUrl(): string {
  const apiUrl = process.env.CMSSY_API_URL ?? "https://api.cmssy.io";
  const org = process.env.CMSSY_ORG_SLUG;
  const workspace = process.env.CMSSY_WORKSPACE_SLUG;
  // Not `?? ""`: an empty segment builds `/public//graphql`, which fails far
  // from the cause. Same rule the app's own config follows.
  if (!org || !workspace) {
    throw new Error(
      "codegen needs CMSSY_ORG_SLUG and CMSSY_WORKSPACE_SLUG. Copy .env.example to .env.local, or set CODEGEN_SCHEMA to a schema file.",
    );
  }
  return `${apiUrl}/public/${org}/${workspace}/graphql`;
}

const config: CodegenConfig = {
  schema: process.env.CODEGEN_SCHEMA || deliverySchemaUrl(),
  // `cmssy/` holds the delivery reads the SDK itself performs, vendored by
  // `pnpm types`. They are typed here like any other document, so this app does
  // not keep a second copy of a query the SDK already sends.
  documents: ["graphql/**/*.graphql", "cmssy/**/*.graphql"],
  ignoreNoDocuments: true,
  generates: {
    "graphql/generated/": {
      preset: "client",
      config: {
        documentMode: "string",

        scalars: {
          DateTime: "string",
          JSON: "unknown",
        },
      },
    },
  },
};

export default config;
