import { fields, type BlockProps } from "@cmssy/react";
import type { Category } from "../services/catalog";
import styles from "./category-grid.module.css";

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
    <section className={styles.section}>
      {content.heading ? (
        <h2 className={styles.heading}>{content.heading}</h2>
      ) : null}
      <div className={styles.grid}>
        {items.map((category) => (
          <a
            key={category.id}
            href={`/c/${category.slug}`}
            className={`shop-card ${styles.card}`}
          >
            {category.code ? (
              <span className={styles.code}>{category.code}</span>
            ) : null}
            <strong>{category.name}</strong>
            {category.description ? (
              <span className="shop-muted">{category.description}</span>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}
