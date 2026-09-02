export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

// A `*.vercel.app` origin is a demo or a staging one, never a site's real home.
// Vercel marks *preview* deployments noindex on its own and leaves production
// ones alone, so a demo published there is as indexable as anything else - and
// this example is deployed on exactly such a host. Whatever is served from one
// must not compete with a real domain in a search index.
export function isDemoOrigin(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}
