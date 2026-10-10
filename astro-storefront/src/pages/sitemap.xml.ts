import { localizeHref } from "@cmssy/astro";
import type { APIRoute } from "astro";
import { cmssy } from "../cmssy.config";
import type { SiteLocales } from "../lib/locale-path";
import { siteUrlFor } from "../lib/site-url";
import { loadCategories, loadProductSlugs } from "../services/catalog";
import { listPublicPages } from "../services/pages";
import { fetchSiteConfig, resolveSiteLocales } from "../services/site";

export const prerender = false;

interface SitemapAlternate {
  hreflang: string;
  href: string;
}

interface SitemapEntry {
  loc: string;
  lastModified: string | null;
  alternates: SitemapAlternate[];
}

interface SitemapContext extends SiteLocales {
  siteUrl: string;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderEntry(entry: SitemapEntry): string {
  return [
    "  <url>",
    `    <loc>${xmlEscape(entry.loc)}</loc>`,
    entry.lastModified
      ? `    <lastmod>${xmlEscape(entry.lastModified)}</lastmod>`
      : "",
    ...entry.alternates.map(
      (alternate) =>
        `    <xhtml:link rel="alternate" hreflang="${xmlEscape(alternate.hreflang)}" href="${xmlEscape(alternate.href)}" />`,
    ),
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

function pathFor(slug: string): string {
  return slug.startsWith("/") ? slug : `/${slug}`;
}

function entriesFor(
  path: string,
  lastModified: string | null,
  { siteUrl, defaultLocale, locales }: SitemapContext,
): SitemapEntry[] {
  const hrefFor = (locale: string) =>
    `${siteUrl}${localizeHref(path, { default: defaultLocale, enabled: locales, current: locale })}`;
  // One language means no alternates worth listing, and an `x-default`
  // pointing at the only URL on the entry tells a crawler nothing.
  const alternates =
    locales.length > 1
      ? [
          ...locales.map((locale) => ({
            hreflang: locale,
            href: hrefFor(locale),
          })),
          { hreflang: "x-default", href: hrefFor(defaultLocale) },
        ]
      : [];
  return locales.map((locale) => ({
    loc: hrefFor(locale),
    lastModified,
    alternates,
  }));
}

async function pageEntries(context: SitemapContext): Promise<SitemapEntry[]> {
  const [pages, siteConfig] = await Promise.all([
    listPublicPages(),
    fetchSiteConfig(),
  ]);
  const notFoundPageId = siteConfig?.notFoundPageId ?? null;
  return pages
    .filter((page) => page.publishedAt && page.id !== notFoundPageId)
    .flatMap((page) =>
      entriesFor(
        pathFor(page.slug),
        page.updatedAt ?? page.publishedAt ?? null,
        context,
      ),
    );
}

async function shopEntries(context: SitemapContext): Promise<SitemapEntry[]> {
  const [categories, productSlugs] = await Promise.all([
    loadCategories(),
    loadProductSlugs(),
  ]);
  const paths = [
    "/c/all",
    ...categories.map((category) => `/c/${category.slug}`),
    ...productSlugs.map((slug) => `/p/${slug}`),
  ];
  return paths.flatMap((path) => entriesFor(path, null, context));
}

export const GET: APIRoute = async ({ url }) => {
  const locales = await resolveSiteLocales();
  const context: SitemapContext = {
    ...locales,
    siteUrl: siteUrlFor(cmssy, url),
  };
  const [pages, shop] = await Promise.all([
    pageEntries(context),
    shopEntries(context),
  ]);

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...[...pages, ...shop].map(renderEntry),
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};
