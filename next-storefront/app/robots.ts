import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteUrl();
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
