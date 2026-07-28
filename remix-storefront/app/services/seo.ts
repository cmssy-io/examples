import type { CmssyPageMeta } from "@cmssy/core";
import { cmssy } from "../../cmssy.config";
import { PAGE_META_QUERY, publicQuery } from "./gateway";

export type PageMeta = Pick<
  CmssyPageMeta,
  "seoTitle" | "seoDescription" | "displayName"
>;

export async function fetchPageMeta(slug: string): Promise<PageMeta | null> {
  const data = await publicQuery<{
    public: { page: { get: PageMeta | null } };
  }>(PAGE_META_QUERY, { workspaceSlug: cmssy.workspaceSlug, slug });
  return data.public.page.get;
}
