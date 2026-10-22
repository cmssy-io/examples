import { savingsPercent, stockState } from "../../lib/money";
import type { Product } from "../../services/catalog";
import { AddToCartButton } from "./add-to-cart-button";
import styles from "./catalog.module.css";
import { useLocalePath, useMoney, useShopCopy } from "./locale-ui";
import { Badge, type BadgeVariant } from "./ui/badge";
import { buttonClass } from "./ui/button";
import { skuCode } from "./ui/image-placeholder";
import { ProductImage } from "./ui/product-image";

const STOCK_VARIANT: Record<ReturnType<typeof stockState>, BadgeVariant> = {
  in: "success",
  low: "warning",
  out: "destructive",
};

export function StockBadge({
  inventory,
  threshold,
}: {
  inventory: number;
  threshold: number | null;
}) {
  const copy = useShopCopy();
  const state = stockState(inventory, threshold);
  const label = { in: copy.inStock, low: copy.lowStock, out: copy.backorder };
  return (
    <Badge variant={STOCK_VARIANT[state]}>
      {label[state]}
      {state !== "out" ? ` (${inventory})` : null}
    </Badge>
  );
}

export function ProductCard({
  product,
  quickAdd = false,
}: {
  product: Product;
  quickAdd?: boolean;
}) {
  const localePath = useLocalePath();
  const copy = useShopCopy();
  const money = useMoney();
  const bestTier = product.tiers.at(-1);
  const href = localePath(`/p/${product.slug}`);

  return (
    <article className={`sf-card ${styles.card}`}>
      <a href={href} className={styles.thumbLink} tabIndex={-1} aria-hidden>
        <ProductImage
          src={product.image ?? product.gallery[0]}
          code={skuCode(product.sku)}
          alt={product.title}
          className={styles.thumb}
        />
      </a>

      <div className={styles.cardBody}>
        {product.brand ? (
          <span className={styles.cardBrand}>{product.brand}</span>
        ) : null}
        <h3 className={styles.title}>
          <a href={href}>{product.title}</a>
        </h3>
        <span className={styles.cardSku}>{product.sku}</span>

        {product.available === null ? null : (
          <StockBadge
            inventory={product.available}
            threshold={product.lowStockThreshold}
          />
        )}

        {bestTier ? (
          <span className={styles.tierHint}>
            {money(bestTier.price)} {copy.from} {bestTier.minQty}+ (
            {copy.save} {savingsPercent(product.fromPrice, bestTier.price)}%)
          </span>
        ) : null}

        <div className={styles.cardBottom}>
          <div>
            <div
              className={styles.price}
              data-from-price={
                product.hasVariants ? product.fromPrice : undefined
              }
            >
              {product.hasVariants ? `${copy.from} ` : ""}
              {money(product.fromPrice)}
            </div>
            <div className={styles.cardPer}>
              {copy.netPer} {product.unit ?? "pcs"}
            </div>
          </div>
          {quickAdd ? (
            product.hasVariants ? (
              <a href={href} className={buttonClass("outline", "sm")}>
                {copy.chooseOptions}
              </a>
            ) : (
              <AddToCartButton recordId={product.id} name={product.title} />
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}
