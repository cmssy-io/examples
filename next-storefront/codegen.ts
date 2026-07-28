import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "https://api.cmssy.io/graphql",
  documents: ["graphql/**/*.graphql"],
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
