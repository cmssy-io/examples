import type { APIRoute } from "astro";
import { cmssy } from "../cmssy.config";
import type { SiteLocales } from "../lib/locale-path";
import { isDemoOrigin, siteUrlFor } from "../lib/site-url";
import { resolveSiteLocales } from "../services/site";

export const prerender = false;

const PRIVATE_PATHS = ["/cart", "/order"];

function privatePaths({ defaultLocale, locales }: SiteLocales): string[] {
  const prefixes = locales.filter((locale) => locale !== defaultLocale);
  return [
    "/api/",
    "/cmssy-edit",
    ...PRIVATE_PATHS,
    ...prefixes.flatMap((locale) =>
      PRIVATE_PATHS.map((path) => `/${locale}${path}`),
    ),
  ];
}

export const GET: APIRoute = async ({ url }) => {
  const siteUrl = siteUrlFor(cmssy, url);
  // Nothing published on a demo host belongs in a search index, and a sitemap
  // would be an invitation - so that branch says one thing and stops.
  const body = isDemoOrigin(siteUrl)
    ? ["User-agent: *", "Disallow: /", ""].join("\n")
    : [
        "User-agent: *",
        "Allow: /",
        ...privatePaths(await resolveSiteLocales()).map(
          (path) => `Disallow: ${path}`,
        ),
        `Sitemap: ${siteUrl}/sitemap.xml`,
        "",
      ].join("\n");

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
