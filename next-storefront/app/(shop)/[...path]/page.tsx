import { createCmssyPage } from "@cmssy/next/server";
import { cmssy } from "@/cmssy.config";
import { blocks } from "@/cmssy/blocks";
import { CmssyEditor } from "@/cmssy/editor";
import { retryMode } from "@/lib/cmssy/retry-mode";
import { buildPageMetadata } from "@/services/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  return buildPageMetadata(path);
}

export default createCmssyPage(cmssy, blocks, {
  editor: CmssyEditor,
  retry: retryMode(),
});
