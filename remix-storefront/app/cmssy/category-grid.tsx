import { fields, type BlockProps } from "@cmssy/react";
import type { Category } from "../services/catalog";

export const categoryGridProps = {
  heading: fields.text({ label: "Heading", defaultValue: "Shop by category" }),
};

export function CategoryGrid({
  content,
  data,
}: BlockProps<typeof categoryGridProps, { items: Category[] }>) {
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section>
      {content.heading ? <h2>{content.heading}</h2> : null}
      <ul>
        {items.map((category) => (
          <li key={category.id}>
            <a href={`/c/${category.slug}`}>
              {category.code ? <span>{category.code}</span> : null}
              <strong>{category.name}</strong>
              {category.description ? <span>{category.description}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
