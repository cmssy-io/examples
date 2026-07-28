import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "https://api.cmssy.io/graphql",
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
