import { defineBlock } from "@cmssy/react";
import ProductGrid, { productGridProps } from "./ProductGrid";

export const productGridBlock = defineBlock({
  type: "product-grid",
  label: "Product grid",
  component: ProductGrid,
  props: productGridProps,
  loader: async ({ content, context }) => {
    const [{ loadProducts }, { priceProductsAction }] = await Promise.all([
      import("@/lib/catalog"),
      import("@/lib/actions/prices"),
    ]);

    const categoryId = content.category?.id;
    const limit = Number(content.limit) || 8;
    const sort = typeof content.sort === "string" ? content.sort : "title";
    const locale = context?.locale.current;
    const page = await loadProducts({ categoryId, sort, limit, locale });
    return { items: await priceProductsAction(page.items, locale) };
  },
});
