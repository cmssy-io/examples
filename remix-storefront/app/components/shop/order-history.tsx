import { Link } from "react-router";
import type { Order } from "../../graphql/types";
import { formatMoney } from "../../lib/money";
import { useLocalePath, useShopCopy } from "./locale-ui";
import { paymentLabel } from "./order-receipt";
import styles from "./order.module.css";

export function OrderHistory({
  orders,
  payOnline,
}: {
  orders: Order[];
  payOnline: boolean;
}) {
  const localePath = useLocalePath();
  const copy = useShopCopy();

  return (
    <>
      <h2 className={styles.sectionTitle}>{copy.orderHistory}</h2>
      {orders.length === 0 ? (
        <p className="shop-muted">{copy.noOrdersYet}</p>
      ) : (
        <div className={styles.orders}>
          {orders.map((order) => (
            <Link
              key={order.id}
              to={localePath(`/order/${order.id}`)}
              className={`shop-card ${styles.orderRow}`}
            >
              <div>
                <strong>
                  {order.orderNumber ? `#${order.orderNumber}` : order.id}
                </strong>
                {order.poNumber ? (
                  <span className="shop-muted"> - PO {order.poNumber}</span>
                ) : null}
                <div className={styles.status}>
                  {order.status} · {paymentLabel(order, copy, payOnline)}
                </div>
              </div>
              <span>{formatMoney(order.total, order.currency)}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
