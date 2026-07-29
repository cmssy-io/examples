import { existsSync } from "node:fs";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  output: "server",
  adapter: vercel(),
  integrations: [react()],
});
