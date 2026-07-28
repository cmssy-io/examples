import type { CmssyLocalizedValue } from "@cmssy/core";
import { cmssy } from "../cmssy.config";
import { PAGE_META_QUERY, publicQuery } from "./gateway";

export interface PageMeta {
  seoTitle: CmssyLocalizedValue;
  seoDescription: CmssyLocalizedValue;
  displayName: CmssyLocalizedValue;
}

export async function fetchPageMeta(slug: string): Promise<PageMeta | null> {
  try {
    const data = await publicQuery<{
      public: { page: { get: PageMeta | null } };
    }>(PAGE_META_QUERY, { workspaceSlug: cmssy.workspaceSlug, slug });
    return data.public.page.get;
  } catch {
    return null;
  }
}
