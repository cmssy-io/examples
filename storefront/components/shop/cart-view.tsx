"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/cart-provider";
import { useCmssyUser } from "@/components/shop/user-provider";
import { formatMoney } from "@/lib/money";
import { fill } from "@/lib/shop-copy";
import { useLocalePath, useShopCopy } from "./locale-ui";
import styles from "./cart.module.css";

export function CartView() {
  const localePath = useLocalePath();
  const copy = useShopCopy();
  const {
    cart,
    loading,
    error,
    updateItem,
    removeItem,
    applyDiscount,
    removeDiscount,
    setShippingMethod,
    checkout,
  } = useCart();
  const { user } = useCmssyUser();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (!cart || cart.items.length === 0) {
    return (
      <div className={`shop-card ${styles.empty}`}>
        <p>{copy.cartEmpty}</p>
        <Link
          className="shop-btn shop-btn-primary"
          href={localePath("/c/all")}
        >
          {copy.browseCatalog}
        </Link>
      </div>
    );
  }

  const currency = cart.currency;

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();

    try {
      const order = await checkout({
        customerEmail: value("customerEmail"),
        poNumber: value("poNumber") || null,
        customerNote: value("customerNote") || null,
        shippingAddress: {
          name: value("name"),
          company: value("company") || null,
          line1: value("line1"),
          line2: value("line2") || null,
          postalCode: value("postalCode"),
          city: value("city"),
          country: value("country").toUpperCase(),
          phone: value("phone") || null,
          vatId: value("vatId") || null,
        },
      });

      const token = order.accessToken;
      router.push(
        localePath(
          token
            ? `/order/${order.id}?token=${encodeURIComponent(token)}`
            : `/order/${order.id}`,
        ),
      );
    } catch (cause) {
      setCheckoutError(
        cause instanceof Error ? cause.message : copy.checkoutFailed,
      );
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.layout} onSubmit={handleCheckout}>
      <div>
        <div className={`shop-card ${styles.lines}`}>
          {cart.items.map((item) => {
            const snapshot = item.snapshot;
            const tier = snapshot.tiers?.find(
              (candidate) => candidate.price === item.unitPrice,
            );
            const listPrice = snapshot.price;
            const discounted = item.unitPrice < listPrice;

            return (
              <div key={item.id} className={styles.line}>
                <div className={styles.lineInfo}>
                  <span className={styles.lineName}>{snapshot.name}</span>
                  {snapshot.sku ? (
                    <span className={styles.lineSku}>{snapshot.sku}</span>
                  ) : null}
                  <span>
                    {discounted ? (
                      <span className={styles.lineWas}>
                        {formatMoney(listPrice, currency)}
                      </span>
                    ) : null}
                    {formatMoney(item.unitPrice, currency)} {copy.netEach}
                  </span>
                  {tier ? (
                    <span className={styles.lineTier}>
                      {fill(copy.volumePriceApplied, { minQty: tier.minQty })}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => removeItem(item.id)}
                  >
                    {copy.remove}
                  </button>
                </div>

                <input
                  className={`shop-input ${styles.qtyInput}`}
                  type="number"
                  min={1}
                  max={999}
                  defaultValue={item.quantity}
                  aria-label={fill(copy.quantityFor, { name: snapshot.name })}
                  onBlur={(event) => {
                    const quantity = Math.max(
                      1,
                      Number(event.target.value) || 1,
                    );
                    if (quantity !== item.quantity) {
                      void updateItem(item.id, quantity);
                    }
                  }}
                />

                <span className={styles.lineTotal}>
                  {formatMoney(item.unitPrice * item.quantity, currency)}
                </span>
              </div>
            );
          })}
        </div>

        <h2 className={styles.sectionTitle}>{copy.deliveryAddress}</h2>
        <div className={`shop-card ${styles.lines}`} style={{ padding: 20 }}>
          <div className={styles.form}>
            <div className={styles.formFull}>
              <label className="shop-label" htmlFor="customerEmail">
                {copy.email}
              </label>
              <input
                id="customerEmail"
                name="customerEmail"
                type="email"
                required
                className="shop-input"
                defaultValue={user?.email ?? ""}
              />
            </div>
            <div>
              <label className="shop-label" htmlFor="name">
                {copy.contactName}
              </label>
              <input id="name" name="name" required className="shop-input" />
            </div>
            <div>
              <label className="shop-label" htmlFor="company">
                {copy.company}
              </label>
              <input id="company" name="company" className="shop-input" />
            </div>
            <div className={styles.formFull}>
              <label className="shop-label" htmlFor="line1">
                {copy.streetAndNumber}
              </label>
              <input id="line1" name="line1" required className="shop-input" />
            </div>
            <div className={styles.formFull}>
              <label className="shop-label" htmlFor="line2">
                {copy.addressLine2}
              </label>
              <input id="line2" name="line2" className="shop-input" />
            </div>
            <div>
              <label className="shop-label" htmlFor="postalCode">
                {copy.postalCode}
              </label>
              <input
                id="postalCode"
                name="postalCode"
                required
                className="shop-input"
              />
            </div>
            <div>
              <label className="shop-label" htmlFor="city">
                {copy.city}
              </label>
              <input id="city" name="city" required className="shop-input" />
            </div>
            <div>
              <label className="shop-label" htmlFor="country">
                {copy.countryIso}
              </label>
              <input
                id="country"
                name="country"
                required
                maxLength={2}
                placeholder="DE"
                className="shop-input"
              />
            </div>
            <div>
              <label className="shop-label" htmlFor="phone">
                {copy.phone}
              </label>
              <input id="phone" name="phone" className="shop-input" />
            </div>
            <div>
              <label className="shop-label" htmlFor="vatId">
                {copy.vatId}
              </label>
              <input id="vatId" name="vatId" className="shop-input" />
            </div>
            <div>
              <label className="shop-label" htmlFor="poNumber">
                {copy.poNumber}
              </label>
              <input id="poNumber" name="poNumber" className="shop-input" />
            </div>
            <div className={styles.formFull}>
              <label className="shop-label" htmlFor="customerNote">
                {copy.noteForWarehouse}
              </label>
              <input
                id="customerNote"
                name="customerNote"
                className="shop-input"
              />
            </div>
          </div>
        </div>
      </div>

      <aside className={`shop-card ${styles.summary}`}>
        <div className={styles.shipping}>
          <span className="shop-label" style={{ margin: 0 }}>
            {copy.delivery}
          </span>
          {cart.availableShippingMethods.map((method) => (
            <label
              key={method.id}
              className={`${styles.shippingOption} ${
                cart.shippingMethod?.id === method.id
                  ? styles.shippingOptionActive
                  : ""
              }`}
            >
              <input
                type="radio"
                name="shippingMethod"
                checked={cart.shippingMethod?.id === method.id}
                onChange={() => void setShippingMethod(method.id)}
              />
              <span>
                {method.label}
                {method.etaLabel ? (
                  <span className={styles.shippingEta}>
                    {" "}
                    - {method.etaLabel}
                  </span>
                ) : null}
              </span>
              <span className={styles.shippingPrice}>
                {formatMoney(method.price, currency)}
              </span>
            </label>
          ))}
        </div>

        <div className={styles.discountRow}>
          <input
            className="shop-input"
            placeholder={copy.discountCode}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            aria-label={copy.discountCode}
          />
          {cart.appliedDiscount ? (
            <button
              type="button"
              className="shop-btn"
              onClick={() => void removeDiscount()}
            >
              {copy.remove}
            </button>
          ) : (
            <button
              type="button"
              className="shop-btn"
              onClick={() => void applyDiscount(code.trim())}
              disabled={!code.trim() || loading}
            >
              {copy.apply}
            </button>
          )}
        </div>

        <div className={styles.row}>
          <span>{copy.subtotalNet}</span>
          <span>{formatMoney(cart.subtotal, currency)}</span>
        </div>

        {cart.appliedDiscount ? (
          <div className={styles.row}>
            <span>
              {copy.discount} {cart.appliedDiscount.code}
            </span>
            <span>
              -{formatMoney(cart.subtotal - cart.discountedTotal, currency)}
            </span>
          </div>
        ) : null}

        <div className={styles.row}>
          <span>{copy.delivery}</span>
          <span>
            {cart.shippingMethod
              ? formatMoney(cart.shippingTotal, currency)
              : copy.selectAMethod}
          </span>
        </div>

        {cart.taxSummary.map((line) => (
          <div key={line.rateId ?? line.name} className={styles.taxLine}>
            <span>{line.name ?? `VAT ${line.rate}%`}</span>
            <span>{formatMoney(line.amount, currency)}</span>
          </div>
        ))}

        <div className={styles.rowTotal}>
          <span>{copy.totalInclVat}</span>
          <span>{formatMoney(cart.totalGross, currency)}</span>
        </div>

        <button
          type="submit"
          className="shop-btn shop-btn-primary"
          disabled={submitting || loading || !cart.shippingMethod}
        >
          {submitting ? copy.placingOrder : copy.placeOrder}
        </button>

        {!cart.shippingMethod ? (
          <span className="shop-muted" style={{ fontSize: 13 }}>
            {copy.chooseDeliveryMethod}
          </span>
        ) : null}

        {checkoutError ? (
          <span className="shop-error">{checkoutError}</span>
        ) : null}
        {error ? <span className="shop-error">{error}</span> : null}
      </aside>
    </form>
  );
}
