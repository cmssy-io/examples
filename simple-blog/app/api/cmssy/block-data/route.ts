import { createCmssyBlockDataRoute } from "@cmssy/next/server";
import { cmssy } from "@/cmssy.config";
import { blocks } from "@/cmssy/blocks";

export const POST = createCmssyBlockDataRoute(cmssy, blocks);
