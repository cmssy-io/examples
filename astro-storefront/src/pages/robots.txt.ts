import type { APIRoute } from "astro";
import { cmssy } from "../cmssy.config";
import { siteUrlFor } from "../lib/site-url";

export const prerender = false;

export const GET: APIRoute = ({ request, url }) => {
  const siteUrl = siteUrlFor(cmssy, url, request);
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /cmssy-edit",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
