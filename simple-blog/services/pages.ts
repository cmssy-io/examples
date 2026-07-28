import { cmssy } from "@/cmssy.config";
import { PAGE_LIST_QUERY, publicQuery } from "@/services/gateway";

export type PublicPage = {
  id: string;
  slug: string;
  updatedAt: string | null;
  publishedAt: string | null;
};

type PageList = { public: { page: { list: PublicPage[] } } };

/** The published page tree - what the sitemap is built from. */
export async function listPublicPages(): Promise<PublicPage[]> {
  try {
    const data = await publicQuery<PageList>(PAGE_LIST_QUERY, {
      workspaceSlug: cmssy.workspaceSlug,
    });
    return data.public.page.list;
  } catch {
    return [];
  }
}

/**
 * The paths to prerender. Deliberately not `listPublicPages` - that one returns
 * an empty list when delivery is down, which a sitemap survives and this does
 * not: zero params means the route is served on demand and cached by nothing,
 * with a green build and no warning. Let the build fail instead.
 */
export async function publishedPaths(): Promise<{ path: string[] }[]> {
  const data = await publicQuery<PageList>(PAGE_LIST_QUERY, {
    workspaceSlug: cmssy.workspaceSlug,
  });

  return data.public.page.list
    .filter((page) => page.publishedAt)
    .map((page) => ({ path: page.slug.split("/").filter(Boolean) }));
}
