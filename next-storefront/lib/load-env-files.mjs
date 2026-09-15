import { existsSync, readFileSync } from "node:fs";

// Next loads `.env` / `.env.local` for the app. Scripts that run outside Next -
// `codegen.ts`, `smoke:edit` - get none of that, so they read the same files
// themselves or they point somewhere the app never talks to.
export function loadEnvFiles() {
  // Both files, `.env.local` last so it wins - a checkout may split the
  // workspace slugs from the secret. Reading only one silently loses half the
  // credentials.
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    // `\r?\n`, because `.` does not match `\r` and `$` without /m anchors at
    // the end of input: on a CRLF file a `\n`-only split matches no line at all.
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(
        line,
      );
      if (!match) continue;
      // A real environment variable wins over the file, the way every other
      // dotenv loader works - otherwise CI cannot override what a checkout has.
      const [, name, rest] = match;
      if (process.env[name]) continue;
      // Balanced quotes only: stripping one lone quote turns a valid secret
      // into an invalid one, and the failure then blames the caller instead.
      const raw = rest.trim();
      const quoted = /^(["'])(.*)\1$/.exec(raw);
      process.env[name] = quoted ? quoted[2] : raw;
    }
  }
}
