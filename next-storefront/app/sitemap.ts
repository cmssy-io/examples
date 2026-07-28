import type { MetadataRoute } from "next";
import { loadCategories, loadProducts } from "@/lib/catalog";
import { localePath } from "@/lib/locale";
import { fetchSiteConfig, resolveSiteLocales } from "@/services/site";
import { listPublicPages } from "@/services/pages";
import { siteUrl } from "@/lib/site-url";

const PAGE_SIZE = 50;
const MAX_PAGES = 40;

interface SitemapContext {
  baseUrl: string;
  defaultLocale: string;
  locales: string[];
}

async function allProductSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { items, hasMore } = await loadProducts({ page, limit: PAGE_SIZE });
    slugs.push(...items.map((product) => product.slug));
    if (!hasMore) return slugs;
  }
  console.warn(
    `sitemap: stopped after ${MAX_PAGES} pages - the catalog has more products than that`,
  );
  return slugs;
}

function languagesFor(path: string, { baseUrl, defaultLocale, locales }: SitemapContext) {
  return {
    languages: {
      ...Object.fromEntries(
        locales.map((locale) => [
          locale,
          `${baseUrl}${localePath(path, locale, defaultLocale)}`,
        ]),
      ),
      "x-default": `${baseUrl}${localePath(path, defaultLocale, defaultLocale)}`,
    },
  };
}

async function shopEntries(
  context: SitemapContext,
): Promise<MetadataRoute.Sitemap> {
  const { baseUrl, defaultLocale, locales } = context;
  const [categories, productSlugs] = await Promise.all([
    loadCategories(),
    allProductSlugs(),
  ]);

  const paths = [
    "/",
    "/c/all",
    ...categories.map((category) => `/c/${category.slug}`),
    ...productSlugs.map((slug) => `/p/${slug}`),
  ];

  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${baseUrl}${localePath(path, locale, defaultLocale)}`,
      ...(locales.length > 1 ? { alternates: languagesFor(path, context) } : {}),
    })),
  );
}

async function pageEntries(
  context: SitemapContext,
): Promise<MetadataRoute.Sitemap> {
  const { baseUrl, defaultLocale, locales } = context;
  const [pages, siteConfig] = await Promise.all([
    listPublicPages(),
    fetchSiteConfig(),
  ]);

  // `list` returns drafts too, and the 404 page is published like any other.
  // Both belong out of a sitemap; the workspace already says which page is 404.
  const notFoundPageId = siteConfig?.notFoundPageId ?? null;
  const publishedPages = pages.filter(
    (page) => page.publishedAt && page.id !== notFoundPageId,
  );

  return publishedPages.flatMap((page) => {
    const path = page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
    return locales.map((locale) => ({
      url: `${baseUrl}${localePath(path, locale, defaultLocale)}`,
      lastModified: page.updatedAt ?? undefined,
      ...(locales.length > 1 ? { alternates: languagesFor(path, context) } : {}),
    }));
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { defaultLocale, locales } = await resolveSiteLocales();
  const context: SitemapContext = { baseUrl: siteUrl(), defaultLocale, locales };
  const [pages, shop] = await Promise.all([
    pageEntries(context),
    shopEntries(context),
  ]);
  return [...pages, ...shop];
}
