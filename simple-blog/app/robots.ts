import type { MetadataRoute } from "next";
import { isDemoOrigin, SITE_URL } from "@/services/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // Nothing published on a demo host belongs in a search index, and a sitemap
  // would be an invitation - so that branch says one thing and stops.
  if (isDemoOrigin(SITE_URL)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

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
