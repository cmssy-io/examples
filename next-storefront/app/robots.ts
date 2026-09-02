import type { MetadataRoute } from "next";
import { isDemoOrigin, siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
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

        disallow: ["/api/", "/cart", "/account", "/order"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
