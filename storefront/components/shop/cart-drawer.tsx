"use client";

import Link from "next/link";
import { useCart } from "@/components/shop/cart-provider";
import { formatMoney } from "@/lib/money";
import { useCartUi } from "./cart-ui";
import { useLocalePath, useShopCopy } from "./locale-ui";
import styles from "./cart-drawer.module.css";

function CartIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

export function CartDrawer() {
  const localePath = useLocalePath();
  const copy = useShopCopy();
  const { cart } = useCart();
  const { drawerOpen, toastName, closeDrawer, dismissToast } = useCartUi();

  if (!drawerOpen) return null;

  const currency = cart?.currency ?? "EUR";
  const items = cart?.items ?? [];
  const itemCount = cart?.itemCount ?? 0;

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.scrim}
        onClick={closeDrawer}
        aria-label={copy.closeCart}
      />

      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={copy.cart}
      >
        <div className={styles.head}>
          <span className={styles.title}>
            <CartIcon />
            {copy.cart} · {itemCount}{" "}
            {itemCount === 1 ? copy.itemOne : copy.itemMany}
          </span>
          <button
            type="button"
            className={styles.close}
            onClick={closeDrawer}
            aria-label={copy.closeCart}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.lines}>
          {items.length === 0 ? (
            <p className={styles.empty}>{copy.cartEmpty}</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className={styles.line}>
                <span className={styles.thumb} aria-hidden>
                  {item.snapshot.sku?.slice(0, 4) ?? "—"}
                </span>
                <div className={styles.body}>
                  <div className={styles.name}>{item.snapshot.name}</div>
                  {item.snapshot.sku ? (
                    <div className={styles.sku}>{item.snapshot.sku}</div>
                  ) : null}
                  <div className={styles.lineFoot}>
                    <span className={styles.qty}>
                      {copy.qty} {item.quantity}
                    </span>
                    <span className={styles.lineTotal}>
                      {formatMoney(item.unitPrice * item.quantity, currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 ? (
          <div className={styles.foot}>
            <div className={styles.row}>
              <span>{copy.netSubtotal}</span>
              <span className={styles.rowValue}>
                {formatMoney(cart?.subtotal ?? 0, currency)}
              </span>
            </div>
            <div className={styles.total}>
              <span>{copy.totalGross}</span>
              <span>{formatMoney(cart?.totalGross ?? 0, currency)}</span>
            </div>
            <Link
              href={localePath("/cart")}
              className={`shop-btn shop-btn-primary ${styles.checkout}`}
              onClick={closeDrawer}
            >
              {copy.goToCheckout}
            </Link>
            <button
              type="button"
              className={`shop-btn ${styles.continue}`}
              onClick={closeDrawer}
            >
              {copy.continueShopping}
            </button>
          </div>
        ) : null}
      </aside>

      {toastName ? (
        <div className={styles.toast} role="status">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>
            {copy.addedToCart} —{" "}
            <span className={styles.toastName}>{toastName}</span>
          </span>
          <button
            type="button"
            className={styles.close}
            onClick={dismissToast}
            aria-label={copy.dismiss}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
