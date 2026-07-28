import Link from "next/link";
import { fields, type BlockProps } from "@cmssy/react";
import type { Category } from "@/lib/catalog";
import styles from "./CategoryGrid.module.css";

export const categoryGridProps = {
  heading: fields.text({ label: "Heading", defaultValue: "Shop by category" }),
};

export default function CategoryGrid({
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
          <Link
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
          </Link>
        ))}
      </div>
    </section>
  );
}
