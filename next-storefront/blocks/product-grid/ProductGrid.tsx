import { ProductCard } from "@/components/shop/product-card";
import type { Product } from "@/lib/catalog";
import { CATEGORY_MODEL } from "@/lib/catalog-models";
import { fields, type BlockProps } from "@cmssy/react";
import catalog from "@/components/shop/catalog.module.css";
import styles from "./ProductGrid.module.css";

export const productGridProps = {
  heading: fields.text({ label: "Heading", defaultValue: "Popular lines" }),
  category: fields.relation({
    label: "Category",
    model: CATEGORY_MODEL,
    helperText: "Leave empty to pull from the whole catalog",
  }),
  sort: fields.select({
    label: "Sort",
    options: ["title", "price", "-price"],
    defaultValue: "title",
  }),
  limit: fields.number({ label: "Products shown", defaultValue: 8 }),
};

export default function ProductGrid({
  content,
  data,
}: BlockProps<typeof productGridProps, { items: Product[] }>) {
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className={styles.section}>
      {content.heading ? (
        <h2 className={styles.heading}>{content.heading}</h2>
      ) : null}
      <div className={catalog.grid}>
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
