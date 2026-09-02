import type { CmssyConfig } from "@cmssy/astro";

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

export function siteUrlFor(config: CmssyConfig, url: URL): string {
  if (config.siteUrl) return stripTrailingSlashes(config.siteUrl);

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelHost) return stripTrailingSlashes(`https://${vercelHost}`);

  if (import.meta.env.DEV && LOOPBACK.test(url.host)) {
    return stripTrailingSlashes(url.origin);
  }

  throw new Error(
    "cmssy: set CMSSY_SITE_URL to this site's public origin. Any other host on the request comes from the client, and this value is published in sitemap.xml and robots.txt.",
  );
}

// A `*.vercel.app` origin is a demo or a staging one, never a site's real home.
// Vercel marks *preview* deployments noindex on its own and leaves production
// ones alone, so a demo published there is as indexable as anything else - and
// this example is deployed on exactly such a host. Whatever is served from one
// must not compete with a real domain in a search index.
export function isDemoOrigin(siteUrl: string): boolean {
  try {
    return new URL(siteUrl).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}
