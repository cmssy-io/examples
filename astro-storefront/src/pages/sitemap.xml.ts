import type { APIRoute } from "astro";
import { cmssy } from "../cmssy.config";
import { localizedPath } from "../lib/locale-path";
import { siteUrlFor } from "../lib/site-url";
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

export const GET: APIRoute = async ({ request, url }) => {
  const siteUrl = siteUrlFor(cmssy, url, request);
  const [{ defaultLocale, locales }, pages, siteConfig] = await Promise.all([
    resolveSiteLocales(),
    listPublicPages(),
    fetchSiteConfig(),
  ]);
  const notFoundPageId = siteConfig?.notFoundPageId ?? null;

  const entries = pages
    .filter((page) => page.publishedAt && page.id !== notFoundPageId)
    .flatMap((page) => {
      const hrefFor = (locale: string) =>
        `${siteUrl}${localizedPath(page.slug, locale, defaultLocale)}`;
      const alternates: SitemapAlternate[] = [
        ...locales.map((locale) => ({
          hreflang: locale,
          href: hrefFor(locale),
        })),
        { hreflang: "x-default", href: hrefFor(defaultLocale) },
      ];

      return locales.map((locale) => ({
        loc: hrefFor(locale),
        lastModified: page.updatedAt ?? page.publishedAt,
        alternates,
      }));
    });

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.map(renderEntry),
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};
