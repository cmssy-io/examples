import type { CmssyConfig } from "@cmssy/astro";

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

export function siteUrlFor(config: CmssyConfig, url: URL): string {
  if (config.siteUrl) return stripTrailingSlashes(config.siteUrl);

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelHost) return `https://${vercelHost}`;

  if (process.env.NODE_ENV !== "production") {
    return stripTrailingSlashes(url.origin);
  }

  throw new Error(
    "cmssy: set CMSSY_SITE_URL to this site's public origin. It cannot be read from the request in production - Host and X-Forwarded-Host come from the client, and this value is published in sitemap.xml and robots.txt.",
  );
}
