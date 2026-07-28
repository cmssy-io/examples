import { defineBlock } from "@cmssy/react";
import Faq, { faqProps } from "./Faq";

export const faqBlock = defineBlock({
  type: "faq",
  label: "FAQ",
  component: Faq,
  props: faqProps,
});
