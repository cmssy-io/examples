import { heroBlock } from "@/blocks/hero/block";
import { proseBlock } from "@/blocks/prose/block";
import { blogIndexBlock } from "@/blocks/blog-index/block";
import { shopHeroBlock } from "@/blocks/shop-hero/block";
import { promoStripBlock } from "@/blocks/promo-strip/block";
import { valuePropsBlock } from "@/blocks/value-props/block";
import { categoryGridBlock } from "@/blocks/category-grid/block";
import { productGridBlock } from "@/blocks/product-grid/block";
import { featureMediaBlock } from "@/blocks/feature-media/block";
import { statsBandBlock } from "@/blocks/stats-band/block";
import { faqBlock } from "@/blocks/faq/block";
import { ctaBannerBlock } from "@/blocks/cta-banner/block";
import { siteHeaderBlock } from "@/blocks/site-header/block";
import { siteFooterBlock } from "@/blocks/site-footer/block";

// The single source of truth for which blocks this site can render. The editor
// reads each block's schema over the SDK bridge, so they appear in the picker.
export const blocks = [
  heroBlock,
  proseBlock,
  blogIndexBlock,
  shopHeroBlock,
  promoStripBlock,
  valuePropsBlock,
  categoryGridBlock,
  productGridBlock,
  featureMediaBlock,
  statsBandBlock,
  faqBlock,
  ctaBannerBlock,
  siteHeaderBlock,
  siteFooterBlock,
];
