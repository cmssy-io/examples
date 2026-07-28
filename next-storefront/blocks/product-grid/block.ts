import { defineBlock } from "@cmssy/react";
import ProductGrid, { productGridProps } from "./ProductGrid";

export const productGridBlock = defineBlock({
  type: "product-grid",
  label: "Product grid",
  component: ProductGrid,
  props: productGridProps,
  loader: async ({ content, context }) => {
    const { loadCategories, loadProducts } = await import("@/lib/catalog");

    const categorySlug =
      typeof content.categorySlug === "string" ? content.categorySlug : "";
    let categoryId: string | undefined;
    if (categorySlug) {
      const categories = await loadCategories(context?.locale.current);
      const category = categories.find((item) => item.slug === categorySlug);
      if (!category) return { items: [] };
      categoryId = category.id;
    }

    const limit = Number(content.limit) || 8;
    const sort = typeof content.sort === "string" ? content.sort : "title";
    const page = await loadProducts({
      categoryId,
      sort,
      limit,
      locale: context?.locale.current,
    });
    return { items: page.items };
  },
});
