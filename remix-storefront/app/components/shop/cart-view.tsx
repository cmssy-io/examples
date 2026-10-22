import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { fill } from "../../lib/shop-copy";
import { readOrderFieldValues } from "../../lib/order-fields";
import type { OrderField } from "../../graphql/types";
import { selectionLabel } from "../../lib/variants";
import { useCart } from "./cart-provider";
import styles from "./cart.module.css";
import {
  useLocalePath,
  useMoney,
  useShopCopy,
  useShopLocale,
} from "./locale-ui";
import { OrderFieldInputs } from "./order-fields";

export function CartView({ orderFields }: { orderFields: OrderField[] }) {
  const localePath = useLocalePath();
  const { locale, defaultLocale } = useShopLocale();
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
  const money = useMoney(cart?.currency);
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (!cart || cart.items.length === 0) {
    return (
      <div className={`shop-card ${styles.empty}`}>
        <p>{copy.cartEmpty}</p>
        <Link className="shop-btn shop-btn-primary" to={localePath("/c/all")}>
          {copy.browseCatalog}
        </Link>
      </div>
    );
  }


  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();

    try {
      const { order } = await checkout({
        customerEmail: value("customerEmail"),
        poNumber: value("poNumber") || null,
        customerNote: value("customerNote") || null,
        customFields: readOrderFieldValues(form, orderFields),
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
      const confirmation = localePath(
        token
          ? `/order/${order.id}?token=${encodeURIComponent(token)}`
          : `/order/${order.id}`,
      );

      void navigate(confirmation);
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
            const options = selectionLabel(item.variantSelections);

            return (
              <div key={item.id} className={styles.line}>
                <div className={styles.lineInfo}>
                  <span className={styles.lineName}>{snapshot.name}</span>
                  {snapshot.sku ? (
                    <span className={styles.lineSku}>{snapshot.sku}</span>
                  ) : null}
                  {options ? (
                    <span className={styles.lineOptions}>{options}</span>
                  ) : null}
                  <span>
                    {discounted ? (
                      <span className={styles.lineWas}>
                        {money(listPrice)}
                      </span>
                    ) : null}
                    {money(item.unitPrice)} {copy.netEach}
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
                  {money(item.unitPrice * item.quantity)}
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
            <OrderFieldInputs
              fields={orderFields}
              locale={{ locale, defaultLocale }}
            />
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
                {money(method.price)}
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
          <span>{money(cart.subtotal)}</span>
        </div>

        {cart.appliedDiscount ? (
          <div className={styles.row}>
            <span>
              {copy.discount} {cart.appliedDiscount.code}
            </span>
            <span>
              -{money(cart.subtotal - cart.discountedTotal)}
            </span>
          </div>
        ) : null}

        <div className={styles.row}>
          <span>{copy.delivery}</span>
          <span>
            {cart.shippingMethod
              ? money(cart.shippingTotal)
              : copy.selectAMethod}
          </span>
        </div>

        {cart.taxSummary.map((line) => (
          <div key={line.rateId ?? line.name} className={styles.taxLine}>
            <span>{line.name ?? `VAT ${line.rate}%`}</span>
            <span>{money(line.amount)}</span>
          </div>
        ))}

        <div className={styles.rowTotal}>
          <span>{copy.totalInclVat}</span>
          <span>{money(cart.totalGross)}</span>
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
