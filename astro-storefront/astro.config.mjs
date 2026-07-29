import { existsSync } from "node:fs";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  output: "server",
  adapter: process.env.LOCAL_SERVE
    ? node({ mode: "standalone" })
    : vercel(),
  integrations: [react()],
});
