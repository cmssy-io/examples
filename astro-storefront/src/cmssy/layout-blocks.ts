import { defineBlock } from "@cmssy/react";
import { SiteFooter, siteFooterProps } from "./site-footer";
import { SiteHeader, siteHeaderProps } from "./site-header";

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

export const siteFooterBlock = defineBlock({
  type: "site-footer",
  label: "Site footer",
  category: "Layout",
  component: SiteFooter,
  props: siteFooterProps,
});

export const layoutBlocks = [siteHeaderBlock, siteFooterBlock];
