import { cmssy } from "@/cmssy.config";
import {
  PublicPagesDocument,
  type PublicPagesQuery,
} from "@/graphql/generated/graphql";
import { publicRequest } from "@/services/gateway";

export type PublicPage = PublicPagesQuery["public"]["page"]["list"][number];

export async function listPublicPages(): Promise<PublicPage[]> {
  const data = await publicRequest(PublicPagesDocument, {
    workspaceSlug: cmssy.workspaceSlug,
  });
  return data.public?.page?.list ?? [];
}
