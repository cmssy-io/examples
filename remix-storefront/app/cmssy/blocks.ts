import { defineBlock } from "@cmssy/react";
import { BlogIndex, blogIndexProps } from "./blog-index";
import { CategoryGrid, categoryGridProps } from "./category-grid";
import { CtaBanner, ctaBannerProps } from "./cta-banner";
import { Faq, faqProps } from "./faq";
import { FeatureMedia, featureMediaProps } from "./feature-media";
import { Hero, heroProps } from "./hero";
import { ProductGrid, productGridProps } from "./product-grid";
import { PromoStrip, promoStripProps } from "./promo-strip";
import { Prose, proseProps } from "./prose";
import { ShopHero, shopHeroProps } from "./shop-hero";
import { SiteFooter, siteFooterProps } from "./site-footer";
import { SiteHeader, siteHeaderProps } from "./site-header";
import { StatsBand, statsBandProps } from "./stats-band";
import { ValueProps, valuePropsProps } from "./value-props";

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

export const valuePropsBlock = defineBlock({
  type: "value-props",
  label: "Value props",
  component: ValueProps,
  props: valuePropsProps,
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
    return { items: await loadCategories(context?.locale.current) };
  },
});

export const productGridBlock = defineBlock({
  type: "product-grid",
  label: "Product grid",
  component: ProductGrid,
  props: productGridProps,
  loader: async ({ content, context }) => {
    const { loadProducts } = await import("../services/catalog");
    const page = await loadProducts({
      categoryId: content.category?.id,
      sort: typeof content.sort === "string" ? content.sort : "title",
      limit: Number(content.limit) || 8,
      locale: context?.locale.current,
    });
    return { items: page.items };
  },
});

export const proseBlock = defineBlock({
  type: "prose",
  label: "Prose",
  component: Prose,
  props: proseProps,
  loader: async ({ content }) => {
    const html = content.body ?? "";
    if (!html) return { html: "" };
    const { default: sanitizeHtml } = await import("sanitize-html");
    return {
      html: sanitizeHtml(html, {
        allowedTags: [
          "p",
          "strong",
          "em",
          "ul",
          "ol",
          "li",
          "a",
          "h2",
          "h3",
          "br",
        ],
        allowedAttributes: { a: ["href", "target", "rel"] },
        allowedSchemes: ["http", "https", "mailto", "tel"],
      }),
    };
  },
});

export const blogIndexBlock = defineBlock({
  type: "blog-index",
  label: "Blog index",
  component: BlogIndex,
  props: blogIndexProps,
  loader: async ({ content, context }) => {
    const parentSlug = content.parentPage?.slug;
    if (!parentSlug) return { items: [] };
    const { loadPosts } = await import("../services/posts");
    return {
      items: await loadPosts({
        parentSlug,
        limit: Number(content.postsPerPage) || 9,
        locale: context?.locale.current,
        defaultLocale: context?.locale.default,
      }),
    };
  },
});

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

export const blocks = [
  heroBlock,
  shopHeroBlock,
  promoStripBlock,
  valuePropsBlock,
  statsBandBlock,
  faqBlock,
  ctaBannerBlock,
  featureMediaBlock,
  categoryGridBlock,
  productGridBlock,
  proseBlock,
  blogIndexBlock,
  siteHeaderBlock,
  siteFooterBlock,
];

export default blocks;
