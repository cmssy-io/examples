import { defineBlock } from "@cmssy/react";
import { CategoryGrid, categoryGridProps } from "./category-grid";
import { CtaBanner, ctaBannerProps } from "./cta-banner";
import { Faq, faqProps } from "./faq";
import { FeatureMedia, featureMediaProps } from "./feature-media";
import { Hero, heroProps } from "./hero";
import { ProductGrid, productGridProps } from "./product-grid";
import { PromoStrip, promoStripProps } from "./promo-strip";
import { ShopHero, shopHeroProps } from "./shop-hero";
import { StatsBand, statsBandProps } from "./stats-band";

export const heroBlock = defineBlock({
  type: "hero",
  label: "Hero",
  component: Hero,
  props: heroProps,
});

export const shopHeroBlock = defineBlock({
  type: "shop-hero",
  label: "Shop hero",
  component: ShopHero,
  props: shopHeroProps,
});

export const promoStripBlock = defineBlock({
  type: "promo-strip",
  label: "Promo strip",
  component: PromoStrip,
  props: promoStripProps,
});

export const statsBandBlock = defineBlock({
  type: "stats-band",
  label: "Stats band",
  component: StatsBand,
  props: statsBandProps,
});

export const faqBlock = defineBlock({
  type: "faq",
  label: "FAQ",
  component: Faq,
  props: faqProps,
});

export const ctaBannerBlock = defineBlock({
  type: "cta-banner",
  label: "CTA banner",
  component: CtaBanner,
  props: ctaBannerProps,
});

export const featureMediaBlock = defineBlock({
  type: "feature-media",
  label: "Feature with media",
  component: FeatureMedia,
  props: featureMediaProps,
});

export const categoryGridBlock = defineBlock({
  type: "category-grid",
  label: "Category grid",
  component: CategoryGrid,
  props: categoryGridProps,
  loader: async ({ context }) => {
    const { loadCategories } = await import("../services/catalog");
    if (!context) return { items: [] };
    return {
      items: await loadCategories({
        current: context.locale.current,
        default: context.locale.default,
      }),
    };
  },
});

export const productGridBlock = defineBlock({
  type: "product-grid",
  label: "Product grid",
  component: ProductGrid,
  props: productGridProps,
  loader: async ({ content, context }) => {
    const { loadProducts } = await import("../services/catalog");
    if (!context) return { items: [] };
    return {
      items: await loadProducts(
        { current: context.locale.current, default: context.locale.default },
        {
          categoryId: content.category?.id,
          sort: content.sort,
          limit: content.limit,
        },
      ),
    };
  },
});

export const blocks = [
  heroBlock,
  shopHeroBlock,
  promoStripBlock,
  statsBandBlock,
  faqBlock,
  ctaBannerBlock,
  featureMediaBlock,
  categoryGridBlock,
  productGridBlock,
];

export default blocks;
