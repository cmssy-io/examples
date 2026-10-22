"use client";

import Link from "next/link";
import type { MyOrders } from "@/graphql/types";
import type { AccountOrderScope } from "@/graphql/generated/graphql";
import { formatMoney } from "@/lib/money";
import { fill } from "@/lib/shop-copy";
import { paymentLabel, progressLabel, showsPayment } from "./order-receipt";
import { useLocalePath, useShopCopy, useShopLocale } from "./locale-ui";
import styles from "./order.module.css";

export function OrderHistory({
  orders,
  page,
  lastPage,
  payOnline,
  scope,
}: {
  orders: MyOrders["items"];
  page: number;
  lastPage: number;
  payOnline: boolean;
  /** Set when the member may switch to their company's orders. */
  scope?: AccountOrderScope;
}) {
  const localePath = useLocalePath();
  const copy = useShopCopy();
  const { locale } = useShopLocale();
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (scope === "COMPANY") params.set("orders", "company");
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return localePath(query ? `/account?${query}` : "/account");
  };
  const tab = (target: AccountOrderScope, label: string) => (
    <Link
      href={localePath(
        target === "COMPANY" ? "/account?orders=company" : "/account",
      )}
      className={scope === target ? styles.orderTabActive : undefined}
      aria-current={scope === target ? "page" : undefined}
    >
      {label}
    </Link>
  );

  return (
    <>
      <h2 className={styles.sectionTitle}>{copy.orderHistory}</h2>
      {scope ? (
        <nav className={styles.orderTabs}>
          {tab("MINE", copy.myOrders)}
          {tab("COMPANY", copy.companyOrders)}
        </nav>
      ) : null}
      {orders.length === 0 ? (
        <p className="shop-muted">{copy.noOrdersYet}</p>
      ) : (
        <div className={styles.orders}>
          {orders.map((order) => (
            <Link
              key={order.id}
              href={localePath(`/order/${order.id}`)}
              className={`shop-card ${styles.orderRow}`}
            >
              <div>
                <strong>
                  {order.orderNumber ? `#${order.orderNumber}` : order.id}
                </strong>
                {order.poNumber ? (
                  <span className="shop-muted"> - PO {order.poNumber}</span>
                ) : null}
                {scope === "COMPANY" ? (
                  <span className="shop-muted">
                    {" "}
                    - {fill(copy.placedBy, { email: order.customerEmail })}
                  </span>
                ) : null}
                <div className={styles.status}>
                  {progressLabel(order, copy)}
                  {showsPayment(order)
                    ? ` · ${paymentLabel(order, copy, payOnline)}`
                    : null}
                </div>
              </div>
              <span>{formatMoney(order.total, order.currency, locale)}</span>
            </Link>
          ))}
        </div>
      )}
      {lastPage > 1 ? (
        <nav className={styles.orderPager} aria-label={copy.paginationAria}>
          {page > 1 ? (
            <Link className="shop-btn" href={pageHref(page - 1)}>
              {copy.previous}
            </Link>
          ) : null}
          <span className="shop-muted">
            {fill(copy.pageOf, { page, last: lastPage })}
          </span>
          {page < lastPage ? (
            <Link className="shop-btn" href={pageHref(page + 1)}>
              {copy.next}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
