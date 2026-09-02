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

export const proseBlock = defineBlock({
  type: "prose",
  label: "Prose",
  component: Prose,
  props: proseProps,
  // Sanitized in the loader, which runs only on the server: the allow-list and
  // sanitize-html itself stay out of the client bundle, and the browser is
  // never the thing deciding which tags were safe.
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
    // `parentPage`, never `parentSlug`: the field was renamed when it became a
    // page selector, and content still holding the old key is what made this
    // block render an empty list in simple-blog for weeks (CMS-1088). The SDK
    // collapses a single-select selector to one PageRef before it gets here.
    const parentSlug = content.parentPage?.slug;
    if (!parentSlug || !context) return { items: [] };
    const { loadPosts } = await import("../services/posts");
    return {
      items: await loadPosts(
        { current: context.locale.current, default: context.locale.default },
        { parentSlug, limit: content.postsPerPage ?? 9 },
      ),
    };
  },
});

// Layout blocks, not page blocks: the workspace puts these in the header and
// footer regions of the homepage and every page inherits them. `category` is
// what tells the editor to file them under Layout rather than the block picker.
export const siteHeaderBlock = defineBlock({
  type: "site-header",
  label: "Site header",
  category: "Layout",
  component: SiteHeader,
  props: siteHeaderProps,
  loader: async ({ context }) => {
    if (!context) return { categories: [] };
    const { loadCategories } = await import("../services/catalog");
    return {
      categories: await loadCategories({
        current: context.locale.current,
        default: context.locale.default,
      }),
    };
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
