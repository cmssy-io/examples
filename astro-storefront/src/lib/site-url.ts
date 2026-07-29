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
