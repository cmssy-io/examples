import { createCmssyBlockDataAction } from "@cmssy/remix";
import { cmssy } from "../../cmssy.config";
import { blocks } from "../cmssy/blocks";

export const action = createCmssyBlockDataAction(cmssy, blocks);
