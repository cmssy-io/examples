import { defineBlock } from "@cmssy/react";
import PromoStrip, { promoStripProps } from "./PromoStrip";

export const promoStripBlock = defineBlock({
  type: "promo-strip",
  label: "Promo strip",
  component: PromoStrip,
  props: promoStripProps,
});
