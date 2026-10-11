import { createCmssyEditPage } from "@cmssy/next/server";
import { cmssy } from "@/cmssy.config";
import { blocks } from "@/cmssy/blocks";
import { CmssyEditor } from "@/cmssy/editor";
import { retryMode } from "@/lib/retry-mode";

export const dynamic = "force-dynamic";

export default createCmssyEditPage(cmssy, blocks, {
  editor: CmssyEditor,
  retry: retryMode(),
});
