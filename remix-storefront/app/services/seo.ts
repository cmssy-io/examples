import { cmssy } from "../../cmssy.config";
import {
  PublicPageMetaDocument,
  type PublicPageMetaQuery,
} from "../graphql/generated/graphql";
import { publicRequest } from "./gateway";

export type PageMeta = NonNullable<PublicPageMetaQuery["public"]["page"]["get"]>;

export async function fetchPageMeta(slug: string): Promise<PageMeta | null> {
  const data = await publicRequest(PublicPageMetaDocument, {
    workspaceSlug: cmssy.workspaceSlug,
    slug,
  });
  return data.public?.page?.get ?? null;
}
