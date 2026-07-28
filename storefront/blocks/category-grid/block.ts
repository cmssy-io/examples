import { defineBlock } from "@cmssy/react";
import CategoryGrid, { categoryGridProps } from "./CategoryGrid";

export const categoryGridBlock = defineBlock({
  type: "category-grid",
  label: "Category grid",
  component: CategoryGrid,
  props: categoryGridProps,
  loader: async ({ context }) => {
    const { loadCategories } = await import("@/lib/catalog");
    return { items: await loadCategories(context?.locale.current) };
  },
});
