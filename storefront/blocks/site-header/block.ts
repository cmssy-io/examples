import { defineBlock } from "@cmssy/react";
import SiteHeader, { siteHeaderProps } from "./SiteHeader";

export const siteHeaderBlock = defineBlock({
  type: "site-header",
  label: "Site header",
  category: "Layout",
  component: SiteHeader,
  props: siteHeaderProps,
  loader: async ({ context }) => {
    const { loadMegaMenu } = await import("./load-mega");
    return { categories: await loadMegaMenu(context?.locale.current) };
  },
});
