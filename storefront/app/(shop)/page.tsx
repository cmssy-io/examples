import { createCmssyPage } from "@cmssy/next/server";
import { cmssy } from "@/cmssy.config";
import { blocks } from "@/cmssy/blocks";
import { CmssyEditor } from "@/cmssy/editor";
import { buildPageMetadata } from "@/services/seo";

export async function generateMetadata() {
  return buildPageMetadata([]);
}

export default createCmssyPage(cmssy, blocks, { path: "/", editor: CmssyEditor });
