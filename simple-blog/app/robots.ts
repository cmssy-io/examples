import type { MetadataRoute } from "next";
import { SITE_URL } from "@/services/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Not optional: /cmssy-edit serves draft content and mounts the editor.
      // Indexed, it would rank a duplicate of every page you have.
      disallow: ["/cmssy-edit/", "/api/"],
    },
    sitemap: SITE_URL ? `${SITE_URL}/sitemap.xml` : undefined,
  };
}
