import type { CmssyPageSummary } from "@cmssy/core";
import { cmssy } from "../../cmssy.config";
import { PAGE_LIST_QUERY, publicQuery } from "./gateway";

interface PageList {
  public: { page: { list: CmssyPageSummary[] } };
}

export async function listPublicPages(): Promise<CmssyPageSummary[]> {
  const data = await publicQuery<PageList>(PAGE_LIST_QUERY, {
    workspaceSlug: cmssy.workspaceSlug,
  });
  return data.public.page.list;
}
