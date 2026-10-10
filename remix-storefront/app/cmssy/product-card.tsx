import { formatMoney, skuCode } from "../lib/money";
import type { Product } from "../services/catalog";
import styles from "./product-card.module.css";

export function ProductCard({ product }: { product: Product }) {
  const href = `/p/${product.slug}`;

  return (
    <article className={`sf-card ${styles.card}`}>
      <a href={href} className={styles.thumb} tabIndex={-1} aria-hidden>
        <span className={styles.code}>{skuCode(product.sku)}</span>
      </a>
      <div className={styles.body}>
        <h3 className={styles.title}>
          <a href={href}>{product.title}</a>
        </h3>
        {product.sku ? <span className={styles.sku}>{product.sku}</span> : null}
        {product.price !== null ? (
          <span className={styles.price}>{formatMoney(product.price)}</span>
        ) : null}
      </div>
    </article>
  );
}
