import { existsSync } from "node:fs";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  plugins: [reactRouter()],
});
