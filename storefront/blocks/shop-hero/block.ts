import { defineBlock } from "@cmssy/react";
import ShopHero, { shopHeroProps } from "./ShopHero";

export const shopHeroBlock = defineBlock({
  type: "shop-hero",
  label: "Shop hero",
  component: ShopHero,
  props: shopHeroProps,
});
