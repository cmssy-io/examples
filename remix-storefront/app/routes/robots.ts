import { cmssy } from "../../cmssy.config";
import type { SiteLocales } from "../lib/locale-path";
import { isDemoOrigin, siteUrlFor } from "../lib/site-url";
import { resolveSiteLocales } from "../services/site";
import type { Route } from "./+types/robots";

const PRIVATE_PATHS = ["/cart", "/account", "/order"];

function privatePaths({ defaultLocale, locales }: SiteLocales): string[] {
  const prefixes = locales.filter((locale) => locale !== defaultLocale);
  return [
    "/api/",
    ...PRIVATE_PATHS,
    ...prefixes.flatMap((locale) =>
      PRIVATE_PATHS.map((path) => `/${locale}${path}`),
    ),
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const siteUrl = siteUrlFor(cmssy, request);
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
}
