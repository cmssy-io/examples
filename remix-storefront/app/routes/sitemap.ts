import { cmssy } from "../../cmssy.config";
import { siteUrlFor } from "../lib/site-url";
import { listPublicPages } from "../services/pages";
import { fetchSiteConfig } from "../services/site";
import type { Route } from "./+types/sitemap";

interface SitemapEntry {
  loc: string;
  lastModified: string | null;
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
  const [pages, siteConfig] = await Promise.all([
    listPublicPages(),
    fetchSiteConfig(),
  ]);
  const notFoundPageId = siteConfig?.notFoundPageId ?? null;

  const entries = pages
    .filter((page) => page.publishedAt && page.id !== notFoundPageId)
    .map<SitemapEntry>((page) => ({
      loc: `${siteUrl}${pathFor(page.slug)}`,
      lastModified: page.updatedAt ?? page.publishedAt,
    }));

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(renderEntry),
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
