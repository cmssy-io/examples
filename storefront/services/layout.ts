import { cmssy } from "@/cmssy.config";
import {
  PublicPageLayoutsDocument,
  type PublicPageLayoutsQuery,
} from "@/graphql/generated/graphql";
import { publicRequest } from "@/services/gateway";

type LayoutGroups = PublicPageLayoutsQuery["public"]["page"]["layouts"];

function pageSlug(path: string): string {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export async function fetchChromeLayouts(
  path: string,
  previewSecret?: string,
): Promise<LayoutGroups> {
  const data = await publicRequest(PublicPageLayoutsDocument, {
    workspaceSlug: cmssy.workspaceSlug,
    pageSlug: pageSlug(path),
    previewSecret: previewSecret ?? null,
  });
  return data?.public?.page?.layouts ?? [];
}
