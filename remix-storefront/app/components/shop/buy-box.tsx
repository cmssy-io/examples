import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useCart } from "./cart-provider";
import { useCartUi } from "./cart-ui";
import type { Product } from "../../services/catalog";
import { formatMoney, savingsPercent, unitPriceFor } from "../../lib/money";
import { StockBadge } from "./product-card";
import { Button } from "./ui/button";
import { useLocalePath, useShopCopy } from "./locale-ui";
import { fill } from "../../lib/shop-copy";
import {
  axisLabel,
  findVariant,
  optionAvailable,
  selectOption,
  selectionsOf,
  variantAxes,
  type VariantSelection,
  variantInStock,
  productOutOfStock,
} from "../../lib/variants";
import styles from "./product-detail.module.css";

export function BuyBox({
  product,
  categorySlug,
}: {
  product: Product;
  categorySlug?: string | null;
}) {
  const copy = useShopCopy();
  const localePath = useLocalePath();
  const { addToCart, error } = useCart();
  const { announceAdded } = useCartUi();
  const [quantity, setQuantity] = useState(1);
  const [selection, setSelection] = useState<VariantSelection>({});

  const [adding, setAdding] = useState(false);

  const hasVariants = product.variants.length > 0;
  const axes = useMemo(() => variantAxes(product.variants), [product.variants]);
  const variant = hasVariants
    ? findVariant(product.variants, axes, selection)
    : null;
  const needsVariant = hasVariants && !variant;

  const basePrice = variant
    ? variant.price
    : hasVariants
      ? Math.min(...product.variants.map((candidate) => candidate.price))
      : product.price;
  const tiers =
    variant && variant.tiers.length > 0 ? variant.tiers : product.tiers;
  const inventory = variant
    ? variant.inventory
    : hasVariants
      ? null
      : product.inventory;
  const outOfStock = variant
    ? !variantInStock(variant)
    : productOutOfStock(product);

  const unitPrice = unitPriceFor(basePrice, tiers, quantity);
  const lineTotal = unitPrice * quantity;
  const taxRate = product.taxRate ?? 0;
  const grossUnit = Math.round(unitPrice * (1 + taxRate / 100));

  const activeTier = [...tiers]
    .sort((a, b) => a.minQty - b.minQty)
    .filter((tier) => quantity >= tier.minQty)
    .at(-1);

  const blocked = needsVariant || (hasVariants && outOfStock);

  async function handleAdd() {
    setAdding(true);
    try {
      const added = await addToCart(
        product.id,
        quantity,
        variant ? { variantSelections: selectionsOf(variant) } : undefined,
      );
      if (added) announceAdded(product.title);
    } finally {
      setAdding(false);
    }
  }

  return (
    <aside className={`shop-card ${styles.buyBox}`}>
      <div>
        <div className={styles.priceRow}>
          {needsVariant ? (
            <span className={styles.from}>{copy.from}</span>
          ) : null}
          <span className={styles.price}>{formatMoney(unitPrice)}</span>
          {activeTier ? (
            <span className={styles.listPrice}>{formatMoney(basePrice)}</span>
          ) : null}
        </div>
        <span className={styles.per}>
          net / {product.unit ?? "pcs"}
          {activeTier
            ? ` - ${copy.contractDiscount} -${savingsPercent(basePrice, activeTier.price)}%`
            : ""}
        </span>
        <span className={styles.gross}>
          {formatMoney(grossUnit)} {fill(copy.inclVat, { rate: taxRate })}
        </span>
      </div>

      {axes.length > 0 ? (
        <div className={styles.options} data-variant-selector>
          {axes.map((axis, index) => (
            <fieldset key={axis.name} className={styles.optionGroup}>
              <legend className="shop-label">
                {axisLabel(copy, axis.name)}
                {selection[axis.name] ? `: ${selection[axis.name]}` : ""}
              </legend>
              <div className={styles.optionValues}>
                {axis.values.map((value) => {
                  const active = selection[axis.name] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.option} ${
                        active ? styles.optionActive : ""
                      }`}
                      aria-pressed={active}
                      disabled={
                        !optionAvailable(
                          product.variants,
                          axes,
                          selection,
                          index,
                          value,
                        )
                      }
                      onClick={() =>
                        setSelection((current) =>
                          selectOption(
                            product.variants,
                            axes,
                            current,
                            axis.name,
                            value,
                          ),
                        )
                      }
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {variant?.sku ? (
            <span className={styles.variantSku}>{variant.sku}</span>
          ) : null}
        </div>
      ) : null}

      {needsVariant || inventory === null ? null : (
        <StockBadge inventory={inventory} />
      )}

      {outOfStock && !hasVariants ? (
        <div className={styles.backorder}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <div>
            <div className={styles.backorderTitle}>{copy.backorderTitle}</div>
            <div>{copy.backorderBody}</div>
          </div>
        </div>
      ) : null}

      {tiers.length > 0 ? (
        <div>
          <h2 className={styles.sectionTitle}>{copy.volumePricing}</h2>
          <table className={styles.tiers}>
            <thead>
              <tr>
                <th scope="col">{copy.quantity}</th>
                <th scope="col">{copy.unitPrice}</th>
                <th scope="col" className={styles.save}>
                  {copy.save}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className={!activeTier ? styles.tierActive : undefined}>
                <td>1 - {tiers[0].minQty - 1}</td>
                <td>{formatMoney(basePrice)}</td>
                <td className={styles.save}>-</td>
              </tr>
              {tiers.map((tier, index) => {
                const next = tiers[index + 1];
                const range = next
                  ? `${tier.minQty} - ${next.minQty - 1}`
                  : `${tier.minQty}+`;
                return (
                  <tr
                    key={tier.minQty}
                    className={
                      activeTier?.minQty === tier.minQty
                        ? styles.tierActive
                        : undefined
                    }
                  >
                    <td>{range}</td>
                    <td>{formatMoney(tier.price)}</td>
                    <td className={styles.save}>
                      {savingsPercent(basePrice, tier.price)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className={styles.qtyRow}>
        <div className={styles.qty}>
          <label className="shop-label" htmlFor="qty">
            {copy.quantity}
          </label>
          <input
            id="qty"
            className="shop-input"
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(event) =>
              setQuantity(
                Math.max(1, Math.floor(Number(event.target.value)) || 1),
              )
            }
          />
        </div>
        <Button
          size="lg"
          style={{ flex: 1 }}
          onClick={handleAdd}
          disabled={adding || blocked}
        >
          {adding
            ? copy.adding
            : needsVariant
              ? copy.chooseOptions
              : hasVariants && outOfStock
                ? copy.outOfStock
                : outOfStock
                  ? copy.backorderNow
                  : fill(copy.addWithTotal, { total: formatMoney(lineTotal) })}
        </Button>
      </div>

      {outOfStock && categorySlug ? (
        <Link
          to={localePath(`/c/${categorySlug}?stock=in`)}
          className={styles.altLink}
        >
          {copy.browseInStockAlternatives}
        </Link>
      ) : null}

      <div className={styles.lineTotal}>
        <span>{copy.lineTotalNet}</span>
        <span className={styles.lineTotalValue}>{formatMoney(lineTotal)}</span>
      </div>

      {error ? <span className="shop-error">{error}</span> : null}

      <div className={styles.meta}>
        {product.packaging ? (
          <span>
            {copy.packaging}: {product.packaging}
          </span>
        ) : null}
        {product.datasheetUrl ? (
          <a href={product.datasheetUrl} target="_blank" rel="noreferrer">
            {copy.datasheet}
          </a>
        ) : null}
      </div>
    </aside>
  );
}
