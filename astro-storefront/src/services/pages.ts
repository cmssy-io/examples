import { cmssy } from "../cmssy.config";
import { PAGE_LIST_QUERY, publicQuery } from "./gateway";

export interface PublicPage {
  id: string;
  slug: string;
  updatedAt: string | null;
  publishedAt: string | null;
}

interface PageList {
  public: { page: { list: PublicPage[] } };
}

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
