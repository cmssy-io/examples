import type { MetadataRoute } from "next";
import { localizedPath } from "@/lib/locale-path";
import { listPublicPages } from "@/services/pages";
import { SITE_URL } from "@/services/seo";
import { fetchSiteConfig, resolveSiteLocales } from "@/services/site";

// Reads live CMS state, so it must not be generated at build time - a static
// sitemap freezes on the day you deployed.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [locales, pages, config] = await Promise.all([
    resolveSiteLocales(),
    listPublicPages(),
    fetchSiteConfig(),
  ]);
  const { defaultLocale } = locales;
  const notFoundPageId = config?.notFoundPageId ?? null;

  // Two filters, two reasons: drafts do not belong in a sitemap, and listing
  // the 404 page invites crawlers to index an error.
  return pages
    .filter((page) => page.publishedAt && page.id !== notFoundPageId)
    .map((page) => ({
      url: `${SITE_URL}${localizedPath(page.slug, defaultLocale, defaultLocale)}`,
      lastModified: new Date(page.updatedAt ?? (page.publishedAt as string)),
      alternates: {
        languages: Object.fromEntries(
          locales.locales.map((l) => [
            l,
            `${SITE_URL}${localizedPath(page.slug, l, defaultLocale)}`,
          ]),
        ),
      },
    }));
}
