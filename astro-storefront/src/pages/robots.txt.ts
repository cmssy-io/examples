import type { APIRoute } from "astro";
import { cmssy } from "../cmssy.config";
import { isDemoOrigin, siteUrlFor } from "../lib/site-url";

export const prerender = false;

export const GET: APIRoute = ({ request, url }) => {
  const siteUrl = siteUrlFor(cmssy, url);
  // Nothing published on a demo host belongs in a search index, and a sitemap
  // would be an invitation - so that branch says one thing and stops.
  const body = isDemoOrigin(siteUrl)
    ? ["User-agent: *", "Disallow: /", ""].join("\n")
    : [
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
