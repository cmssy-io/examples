import { orderProgress, type CmssyOrderProgress } from "@cmssy/core";
import type { PublicOrder } from "../../graphql/types";
import { fill, type ShopCopy } from "../../lib/shop-copy";
import { useMoney } from "./locale-ui";
import styles from "./order.module.css";

export function paymentLabel(order: PublicOrder, copy: ShopCopy) {
  const labels: Record<string, string> = {
    unpaid: copy.awaitingPayment,
    partially_paid: copy.partiallyPaid,
    paid: copy.paid,
    refunded: copy.refunded,
  };
  return labels[order.paymentStatus ?? "unpaid"] ?? order.paymentStatus;
}

export function progressLabel(order: PublicOrder, copy: ShopCopy): string {
  const labels: Record<CmssyOrderProgress, string> = {
    placed: copy.progressPlaced,
    paid: copy.progressPaid,
    shipped: copy.progressShipped,
    out_for_delivery: copy.progressOutForDelivery,
    delivered: copy.progressDelivered,
    refunded: copy.progressRefunded,
    canceled: copy.progressCanceled,
  };
  return labels[orderProgress(order)];
}

export function showsPayment(order: PublicOrder): boolean {
  const progress = orderProgress(order);
  return progress !== "paid" && progress !== "refunded";
}

export function OrderReceipt({
  order,
  copy,
}: {
  order: PublicOrder;
  copy: ShopCopy;
}) {
  const money = useMoney(order.currency);
  const address = order.shippingAddress;
  const items = order.items ?? [];

  return (
    <div className={styles.receipt}>
      {address || order.shippingMethod ? (
        <div className={styles.facts}>
          {address ? (
            <div className={styles.fact}>
              <span className={styles.factLabel}>{copy.deliveryAddress}</span>
              <address className={styles.address}>
                {[
                  address.company,
                  address.name,
                  address.line1,
                  address.line2,
                  `${address.postalCode} ${address.city}`,
                  address.country,
                ]
                  .filter(Boolean)
                  .map((line) => (
                    <span key={line as string}>{line}</span>
                  ))}
              </address>
            </div>
          ) : null}

          {order.shippingMethod ? (
            <div className={styles.fact}>
              <span className={styles.factLabel}>{copy.deliveryMethod}</span>
              <div className={styles.factBody}>
                <span>{order.shippingMethod.label}</span>
                <span className="shop-muted">
                  {money(order.shippingTotal ?? 0)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.lines}>
        {items.map((item, index) => (
          <div
            key={`${item.sku ?? item.name}-${index}`}
            className={styles.line}
          >
            <div>
              <div className={styles.lineName}>{item.name}</div>
              {item.sku ? <div className={styles.sku}>{item.sku}</div> : null}
              {item.tierMinQty ? (
                <div className={styles.tier}>
                  {fill(copy.volumePriceApplied, { minQty: item.tierMinQty })}
                </div>
              ) : null}
            </div>
            <span className={styles.qty}>×{item.quantity}</span>
            <span className={styles.lineTotal}>
              {money(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.totals}>
        <div className={styles.row}>
          <span>{copy.netTotal}</span>
          <span className={styles.rowValue}>
            {money(order.subtotal)}
          </span>
        </div>

        {order.appliedDiscount ? (
          <div className={styles.row}>
            <span>
              {copy.discount} ({order.appliedDiscount.code})
            </span>
            <span className={styles.rowValue}>
              -{money(order.appliedDiscount.amount)}
            </span>
          </div>
        ) : null}

        {order.shippingMethod ? (
          <div className={styles.row}>
            <span>{copy.delivery}</span>
            <span className={styles.rowValue}>
              {money(order.shippingTotal ?? 0)}
            </span>
          </div>
        ) : null}

        {(order.taxSummary ?? []).map((line) => (
          <div key={line.name ?? String(line.rate)} className={styles.row}>
            <span>{line.name ?? `VAT ${line.rate}%`}</span>
            <span className={styles.rowValue}>
              {money(line.amount)}
            </span>
          </div>
        ))}

        <div className={styles.grandTotal}>
          <span>{copy.totalGross}</span>
          <span className={styles.grandTotalValue}>
            {money(order.total)}
          </span>
        </div>
      </div>
    </div>
  );
}
