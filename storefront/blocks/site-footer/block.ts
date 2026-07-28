import { defineBlock } from "@cmssy/react";
import SiteFooter, { siteFooterProps } from "./SiteFooter";

export const siteFooterBlock = defineBlock({
  type: "site-footer",
  label: "Site footer",
  category: "Layout",
  component: SiteFooter,
  props: siteFooterProps,
});
