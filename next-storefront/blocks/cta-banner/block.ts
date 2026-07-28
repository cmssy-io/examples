import { defineBlock } from "@cmssy/react";
import CtaBanner, { ctaBannerProps } from "./CtaBanner";

export const ctaBannerBlock = defineBlock({
  type: "cta-banner",
  label: "CTA banner",
  component: CtaBanner,
  props: ctaBannerProps,
});
