import { Link } from "react-router";
import { formatMoney, savingsPercent, stockState } from "../../lib/money";
import type { Product } from "../../services/catalog";
import { AddToCartButton } from "./add-to-cart-button";
import styles from "./catalog.module.css";
import { useLocalePath, useShopCopy } from "./locale-ui";
import { Badge, type BadgeVariant } from "./ui/badge";
import { skuCode } from "./ui/image-placeholder";
import { ProductImage } from "./ui/product-image";

const STOCK_VARIANT: Record<ReturnType<typeof stockState>, BadgeVariant> = {
  in: "success",
  low: "warning",
  out: "destructive",
};

export function StockBadge({ inventory }: { inventory: number }) {
  const copy = useShopCopy();
  const state = stockState(inventory);
  const label = { in: copy.inStock, low: copy.lowStock, out: copy.backorder };
  return (
    <Badge variant={STOCK_VARIANT[state]}>
      {label[state]}
      {state !== "out" ? ` (${inventory})` : null}
    </Badge>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const localePath = useLocalePath();
  const copy = useShopCopy();
  const bestTier = product.tiers.at(-1);
  const href = localePath(`/p/${product.slug}`);

  return (
    <article className={`sf-card ${styles.card}`}>
      <Link to={href} className={styles.thumbLink} tabIndex={-1} aria-hidden>
        <ProductImage
          src={product.image ?? product.gallery[0]}
          code={skuCode(product.sku)}
          alt={product.title}
          className={styles.thumb}
        />
      </Link>

      <div className={styles.cardBody}>
        {product.brand ? (
          <span className={styles.cardBrand}>{product.brand}</span>
        ) : null}
        <h3 className={styles.title}>
          <Link to={href}>{product.title}</Link>
        </h3>
        <span className={styles.cardSku}>{product.sku}</span>

        <StockBadge inventory={product.inventory} />

        {bestTier ? (
          <span className={styles.tierHint}>
            {formatMoney(bestTier.price)} {copy.from} {bestTier.minQty}+ (
            {copy.save} {savingsPercent(product.price, bestTier.price)}%)
          </span>
        ) : null}

        <div className={styles.cardBottom}>
          <div>
            <div className={styles.price}>{formatMoney(product.price)}</div>
            <div className={styles.cardPer}>
              {copy.netPer} {product.unit ?? "pcs"}
            </div>
          </div>
          <AddToCartButton recordId={product.id} name={product.title} />
        </div>
      </div>
    </article>
  );
}
