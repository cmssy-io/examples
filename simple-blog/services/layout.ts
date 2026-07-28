import type { CmssyLayoutGroup } from "@cmssy/react";
import { cmssy } from "@/cmssy.config";
import { publicQuery, PAGE_LAYOUTS_QUERY } from "@/services/gateway";

/**
 * Header and footer are layout blocks, inherited down the page tree. Pass the
 * draft secret ONLY in draft/edit mode - unconditionally, and the public site
 * starts serving unpublished header changes.
 */
export async function fetchLayoutGroups(
  pageSlug: string,
  previewSecret?: string,
): Promise<CmssyLayoutGroup[]> {
  try {
    const data = await publicQuery<{
      public: { page: { layouts: CmssyLayoutGroup[] } };
    }>(PAGE_LAYOUTS_QUERY, {
      workspaceSlug: cmssy.workspaceSlug,
      pageSlug,
      previewSecret: previewSecret ?? null,
    });
    return data.public.page.layouts;
  } catch {
    return [];
  }
}
