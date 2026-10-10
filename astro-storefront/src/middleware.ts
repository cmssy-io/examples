import { cmssyMiddleware } from "@cmssy/astro";
import { sequence } from "astro:middleware";
import { cmssy } from "./cmssy.config";
import { shopMiddleware } from "./shop/middleware";

export const onRequest = sequence(
  shopMiddleware,
  cmssyMiddleware(cmssy, { stripLocalePrefix: true }),
);
