import type { MetadataRoute } from "next";
import { isDemoOrigin, siteUrl } from "@/lib/site-url";
import { resolveSiteLocales } from "@/services/site";

const PRIVATE_PATHS = ["/cart", "/account", "/order"];

async function privatePaths(): Promise<string[]> {
  const { defaultLocale, locales } = await resolveSiteLocales();
  const prefixes = locales.filter((locale) => locale !== defaultLocale);
  return [
    "/api/",
    ...PRIVATE_PATHS,
    ...prefixes.flatMap((locale) =>
      PRIVATE_PATHS.map((path) => `/${locale}${path}`),
    ),
  ];
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = siteUrl();

  // Nothing published on a demo host belongs in a search index, and a sitemap
  // would be an invitation - so that branch says one thing and stops.
  if (isDemoOrigin(baseUrl)) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",

        disallow: await privatePaths(),
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
