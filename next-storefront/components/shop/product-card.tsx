"use client";

import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { savingsPercent, stockState } from "@/lib/money";
import {
  badgeLabel,
  perUnitLabel,
  withheldLabel,
  type ProductPricing,
} from "@/lib/price-overlay";
import type { BadgeVariant } from "./ui/badge";
import { Badge } from "./ui/badge";
import { skuCode } from "./ui/image-placeholder";
import { ProductImage } from "./ui/product-image";
import { buttonClass } from "./ui/button";
import { AddToCartButton } from "./add-to-cart-button";
import { useLocalePath, useMoney, useShopCopy } from "./locale-ui";
import styles from "./catalog.module.css";

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

export function PriceBadge({
  pricing,
}: {
  pricing: ProductPricing | undefined;
}) {
  const copy = useShopCopy();
  if (pricing?.kind !== "priced" || !pricing.badge) return null;
  return <Badge variant="info">{badgeLabel(pricing.badge, copy)}</Badge>;
}

export function ProductCard({ product }: { product: Product }) {
  const localePath = useLocalePath();
  const copy = useShopCopy();
  const pricing = product.pricing;
  const money = useMoney(pricing?.kind === "priced" ? pricing.currency : null);
  const bestTier = product.tiers.at(-1);
  const href = localePath(`/p/${product.slug}`);

  return (
    <article className={`sf-card ${styles.card}`}>
      <Link
        href={href}
        prefetch={false}
        className={styles.thumbLink}
        tabIndex={-1}
        aria-hidden
      >
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
          <Link href={href} prefetch={false}>
            {product.title}
          </Link>
        </h3>
        <span className={styles.cardSku}>{product.sku}</span>

        {product.available === null ? null : (
          <StockBadge
            inventory={product.available}
            threshold={product.lowStockThreshold}
          />
        )}

        <PriceBadge pricing={pricing} />

        {bestTier && pricing?.kind !== "withheld" ? (
          <span className={styles.tierHint}>
            {money(bestTier.price)} {copy.from} {bestTier.minQty}+ ({copy.save}{" "}
            {savingsPercent(product.fromPrice, bestTier.price)}%)
          </span>
        ) : null}

        <div className={styles.cardBottom}>
          {pricing?.kind === "withheld" ? (
            <Link
              href={localePath("/account")}
              prefetch={false}
              className={styles.withheld}
            >
              {withheldLabel(pricing.reason, copy)}
            </Link>
          ) : (
            <div>
              <div
                className={styles.price}
                data-from-price={
                  product.hasVariants ? product.fromPrice : undefined
                }
              >
                {product.hasVariants ? (
                  <span className={styles.fromPrefix}>{copy.from} </span>
                ) : null}
                {money(product.fromPrice)}
              </div>
              <div className={styles.cardPer}>
                {perUnitLabel(pricing, copy)} {product.unit ?? "pcs"}
              </div>
            </div>
          )}
          {pricing?.kind === "withheld" ? null : product.hasVariants ? (
            <Link
              href={href}
              prefetch={false}
              className={buttonClass("outline", "sm")}
            >
              {copy.chooseOptions}
            </Link>
          ) : (
            <AddToCartButton recordId={product.id} name={product.title} />
          )}
        </div>
      </div>
    </article>
  );
}
