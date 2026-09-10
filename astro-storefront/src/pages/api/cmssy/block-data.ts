import { createCmssyBlockDataEndpoint } from "@cmssy/astro";
import { cmssy } from "../../../cmssy.config";
import { blocks } from "../../../cmssy/blocks";

export const prerender = false;

export const POST = createCmssyBlockDataEndpoint(cmssy, blocks);
