import type { Order, PublicOrder } from "@/graphql/types";
import { formatMoney } from "@/lib/money";
import type { ShopCopy } from "@/lib/shop-copy";
import styles from "./order.module.css";

type ReceiptOrder = Order | PublicOrder;

export function paymentLabel(order: ReceiptOrder, copy: ShopCopy) {
  const labels: Record<string, string> = {
    unpaid: copy.awaitingPayment,
    partially_paid: copy.partiallyPaid,
    paid: copy.paid,
    refunded: copy.refunded,
  };
  return labels[order.paymentStatus ?? "unpaid"] ?? order.status;
}

export function OrderReceipt({
  order,
  copy,
}: {
  order: ReceiptOrder;
  copy: ShopCopy;
}) {
  const currency = order.currency;
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
                  {formatMoney(order.shippingTotal ?? 0, currency)}
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
                  Volume price at {item.tierMinQty}+
                </div>
              ) : null}
            </div>
            <span className={styles.qty}>×{item.quantity}</span>
            <span className={styles.lineTotal}>
              {formatMoney(item.price * item.quantity, currency)}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.totals}>
        <div className={styles.row}>
          <span>{copy.netTotal}</span>
          <span className={styles.rowValue}>
            {formatMoney(order.subtotal, currency)}
          </span>
        </div>

        {order.appliedDiscount ? (
          <div className={styles.row}>
            <span>
              {copy.discount} ({order.appliedDiscount.code})
            </span>
            <span className={styles.rowValue}>
              -{formatMoney(order.appliedDiscount.amount, currency)}
            </span>
          </div>
        ) : null}

        {order.shippingMethod ? (
          <div className={styles.row}>
            <span>{copy.delivery}</span>
            <span className={styles.rowValue}>
              {formatMoney(order.shippingTotal ?? 0, currency)}
            </span>
          </div>
        ) : null}

        {(order.taxSummary ?? []).map((line) => (
          <div key={line.name ?? String(line.rate)} className={styles.row}>
            <span>{line.name ?? `VAT ${line.rate}%`}</span>
            <span className={styles.rowValue}>
              {formatMoney(line.amount, currency)}
            </span>
          </div>
        ))}

        <div className={styles.grandTotal}>
          <span>{copy.totalGross}</span>
          <span className={styles.grandTotalValue}>
            {formatMoney(order.total, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
