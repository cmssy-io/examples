import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";
import cmssy from "@cmssy/eslint-plugin";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  { ignores: [".next/**", "node_modules/**"] },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { cmssy },
    rules: {
      // A client component that reaches the cmssy config drags server env into
      // the browser bundle: the page dies at runtime and no build catches it.
      "cmssy/no-server-config-in-client": "error",
    },
  },
];

export default eslintConfig;
