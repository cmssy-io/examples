"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/cart-provider";
import { useCmssyUser } from "@/components/shop/user-provider";
import { fill } from "@/lib/shop-copy";
import { readOrderFieldValues } from "@/lib/order-fields";
import type { ShippingAddressInput } from "@/graphql/generated/graphql";
import type { OrderField } from "@/graphql/types";
import type { CountryOption } from "@/lib/shipping-countries";
import { selectionLabel } from "@/lib/variants";
import {
  useLocalePath,
  useMoney,
  useShopCopy,
  useShopLocale,
} from "./locale-ui";
import { OrderFieldInputs } from "./order-fields";
import { TaxTreatmentNotice } from "./tax-treatment-notice";
import { Badge } from "./ui/badge";
import { badgeLabel, type PriceBadge } from "@/lib/price-overlay";
import styles from "./cart.module.css";

const ADDRESS_FIELDS = new Set([
  "name",
  "company",
  "line1",
  "line2",
  "postalCode",
  "city",
  "country",
  "region",
  "phone",
  "vatId",
]);

function readAddress(form: HTMLFormElement): ShippingAddressInput {
  const data = new FormData(form);
  const value = (key: string) => String(data.get(key) ?? "").trim();
  return {
    name: value("name"),
    company: value("company") || null,
    line1: value("line1"),
    line2: value("line2") || null,
    postalCode: value("postalCode"),
    city: value("city"),
    country: value("country").toUpperCase(),
    region: value("region") || null,
    phone: value("phone") || null,
    vatId: value("vatId") || null,
  };
}

const REGION_REQUIRED = new Set(["US", "CA", "AU"]);

function isComplete(address: ShippingAddressInput): boolean {
  return Boolean(
    address.name &&
    address.line1 &&
    address.postalCode &&
    address.city &&
    address.phone &&
    /^[A-Z]{2}$/.test(address.country) &&
    (address.region || !REGION_REQUIRED.has(address.country)),
  );
}

export function CartView({
  payOnline,
  orderFields,
  countries,
  priceBadges = {},
}: {
  payOnline: boolean;
  orderFields: OrderField[];
  countries: CountryOption[] | null;
  priceBadges?: Record<string, PriceBadge>;
}) {
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
    setShippingAddress,
    checkout,
    signInRequired,
  } = useCart();
  const { user } = useCmssyUser();
  const router = useRouter();
  const money = useMoney(cart?.currency);

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const sentAddress = useRef<string | null>(null);
  const [country, setCountry] = useState("");
  const addressQueue = useRef<Promise<unknown>>(Promise.resolve());

  if (!cart || cart.items.length === 0) {
    return (
      <div className={`shop-card ${styles.empty}`}>
        <p>{copy.cartEmpty}</p>
        <Link className="shop-btn shop-btn-primary" href={localePath("/c/all")}>
          {copy.browseCatalog}
        </Link>
      </div>
    );
  }

  const gross = cart.displayMode === "gross";

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const shippingAddress = readAddress(event.currentTarget);
    if (!isComplete(shippingAddress)) {
      setCheckoutError(copy.addressIncomplete);
      return;
    }
    setCheckoutError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();

    try {
      const { order, paymentUrl } = await checkout({
        customerEmail: value("customerEmail"),
        poNumber: value("poNumber") || null,
        customerNote: value("customerNote") || null,
        customFields: readOrderFieldValues(form, orderFields),
        shippingAddress,
      });

      const token = order.accessToken;
      const confirmation = localePath(
        token
          ? `/order/${order.id}?token=${encodeURIComponent(token)}`
          : `/order/${order.id}`,
      );

      if (paymentUrl) {
        window.history.pushState(null, "", confirmation);
        window.location.assign(paymentUrl);
        return;
      }

      router.push(confirmation);
    } catch (cause) {
      setCheckoutError(
        cause instanceof Error ? cause.message : copy.checkoutFailed,
      );
      setSubmitting(false);
    }
  }

  function syncAddress(
    event:
      React.FocusEvent<HTMLFormElement> | React.ChangeEvent<HTMLFormElement>,
  ) {
    const field = event.target;
    if (
      !(field instanceof HTMLInputElement) &&
      !(field instanceof HTMLSelectElement)
    )
      return;
    if (!ADDRESS_FIELDS.has(field.name)) return;
    if (field.name === "country") setCountry(field.value.trim().toUpperCase());
    if (event.type === "change" && field.name !== "country") return;
    const address = readAddress(event.currentTarget);
    if (!isComplete(address)) return;
    const key = JSON.stringify(address);
    if (key === sentAddress.current) return;
    sentAddress.current = key;
    addressQueue.current = addressQueue.current.then(async () => {
      if (sentAddress.current !== key) return;
      const accepted = await setShippingAddress(address);
      if (!accepted && sentAddress.current === key) sentAddress.current = null;
    });
  }

  return (
    <form
      className={styles.layout}
      onSubmit={handleCheckout}
      onBlur={syncAddress}
      onChange={syncAddress}
    >
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
            const badge = priceBadges[item.recordId];
            const shownUnit = gross ? item.unit.gross : item.unit.net;
            const shownLine = gross ? item.line.gross : item.line.net;

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
                  {badge ? (
                    <Badge variant="info">{badgeLabel(badge, copy)}</Badge>
                  ) : null}
                  <span>
                    {discounted && !gross ? (
                      <span className={styles.lineWas}>{money(listPrice)}</span>
                    ) : null}
                    {money(shownUnit)} {gross ? copy.inclVatEach : copy.netEach}
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

                <span className={styles.lineTotal}>{money(shownLine)}</span>
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
            <div className={styles.formFull}>
              <label className="shop-label" htmlFor="country">
                {countries ? copy.country : copy.countryIso}
              </label>
              {countries ? (
                <select
                  id="country"
                  name="country"
                  required
                  defaultValue=""
                  className="shop-input"
                >
                  <option value="" disabled>
                    {copy.selectCountry}
                  </option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="country"
                  name="country"
                  required
                  maxLength={2}
                  placeholder="DE"
                  className="shop-input"
                />
              )}
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
              <label className="shop-label" htmlFor="region">
                {copy.region}
              </label>
              <input
                id="region"
                name="region"
                required={REGION_REQUIRED.has(country)}
                className="shop-input"
              />
            </div>
            <div>
              <label className="shop-label" htmlFor="phone">
                {copy.phone}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="shop-input"
              />
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
          {cart.availableShippingMethods.length === 0 ? (
            <span className="shop-muted" style={{ fontSize: 13 }}>
              {copy.deliveryNeedsAddress}
            </span>
          ) : null}
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
                {money(gross ? method.amount.gross : method.price)}
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
          <span>{gross ? copy.subtotalInclVat : copy.subtotalNet}</span>
          <span>
            {money(gross ? cart.amounts.subtotal.gross : cart.subtotal)}
          </span>
        </div>

        {cart.appliedDiscount ? (
          <div className={styles.row}>
            <span>
              {copy.discount} {cart.appliedDiscount.code}
            </span>
            <span>
              -
              {money(
                gross
                  ? cart.amounts.discount.gross
                  : cart.subtotal - cart.discountedTotal,
              )}
            </span>
          </div>
        ) : null}

        <div className={styles.row}>
          <span>{copy.delivery}</span>
          <span>
            {cart.shippingMethod
              ? money(gross ? cart.amounts.shipping.gross : cart.shippingTotal)
              : copy.selectAMethod}
          </span>
        </div>

        <TaxTreatmentNotice treatment={cart.taxTreatment} copy={copy} />

        {cart.taxSummary.map((line) => (
          <div key={line.rateId ?? line.name} className={styles.taxLine}>
            <span>
              {gross
                ? fill(copy.taxIncluded, {
                    tax: line.name ?? fill(copy.taxLine, { rate: line.rate }),
                  })
                : (line.name ?? fill(copy.taxLine, { rate: line.rate }))}
            </span>
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
          {submitting
            ? copy.placingOrder
            : payOnline
              ? copy.placeOrderAndPay
              : copy.placeOrder}
        </button>

        {!cart.shippingMethod ? (
          <span className="shop-muted" style={{ fontSize: 13 }}>
            {copy.chooseDeliveryMethod}
          </span>
        ) : null}

        {checkoutError ? (
          <span className="shop-error">{checkoutError}</span>
        ) : null}
        {error ? (
          <span className="shop-error">
            {error}
            {signInRequired ? (
              <>
                {" "}
                <Link href={localePath("/account")}>{copy.signIn}</Link>
              </>
            ) : null}
          </span>
        ) : null}
      </aside>
    </form>
  );
}
