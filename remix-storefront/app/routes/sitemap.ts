import { localizeHref } from "@cmssy/remix";
import { cmssy } from "../../cmssy.config";
import { siteUrlFor } from "../lib/site-url";
import { listPublicPages } from "../services/pages";
import { fetchSiteConfig, resolveSiteLocales } from "../services/site";
import type { Route } from "./+types/sitemap";

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

function pathFor(slug: string): string {
  const normalized = slug.startsWith("/") ? slug : `/${slug}`;
  return normalized === "/" ? "/" : normalized;
}

export async function loader({ request }: Route.LoaderArgs) {
  const siteUrl = siteUrlFor(cmssy, request);
  const [locales, pages, siteConfig] = await Promise.all([
    resolveSiteLocales(),
    listPublicPages(),
    fetchSiteConfig(),
  ]);
  const notFoundPageId = siteConfig?.notFoundPageId ?? null;

  const entries = pages
    .filter((page) => page.publishedAt && page.id !== notFoundPageId)
    .flatMap<SitemapEntry>((page) => {
      // The SDK owns the prefix rule - the default language has none, every
      // other enabled one is a first segment. A sitemap that spells that out
      // itself is a second implementation of it, and the two drift.
      const hrefFor = (locale: string) =>
        `${siteUrl}${localizeHref(pathFor(page.slug), { ...locales, current: locale })}`;
      // One language means no alternates worth listing, and an `x-default`
      // pointing at the only URL on the entry tells a crawler nothing.
      const alternates =
        locales.enabled.length > 1
          ? [
              ...locales.enabled.map((locale) => ({
                hreflang: locale,
                href: hrefFor(locale),
              })),
              { hreflang: "x-default", href: hrefFor(locales.default) },
            ]
          : [];

      return locales.enabled.map((locale) => ({
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
}
