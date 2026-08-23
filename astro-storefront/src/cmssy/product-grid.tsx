import { fields, type BlockProps } from "@cmssy/react";
import { CATEGORY_MODEL } from "../services/catalog-models";
import type { Product } from "../services/catalog";

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

export function ProductGrid({
  content,
  data,
}: BlockProps<typeof productGridProps, { items: Product[] }>) {
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section>
      {content.heading ? <h2>{content.heading}</h2> : null}
      <ul>
        {items.map((product) => (
          <li key={product.id}>
            <a href={`/p/${product.slug}`}>
              <strong>{product.title}</strong>
              {product.sku ? <span>{product.sku}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
