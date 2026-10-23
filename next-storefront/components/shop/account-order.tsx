"use client";

import Link from "next/link";
import type { Order, OrderField } from "@/graphql/types";
import { OrderReceipt, paymentLabel } from "./order-receipt";
import { PayOrderButton } from "./pay-order-button";
import { ReorderButton } from "./reorder-button";
import { OrderCustomFields } from "./order-fields";
import { OrderReturns } from "./order-returns";
import type { BadgeVariant } from "./ui/badge";
import { Badge } from "./ui/badge";
import { buttonClass } from "./ui/button";
import { useLocalePath, useShopCopy, useShopLocale } from "./locale-ui";
import type { ShopCopy } from "@/lib/shop-copy";
import styles from "./order.module.css";

function paymentVariant(status: string | undefined): BadgeVariant {
  if (status === "paid") return "success";
  if (status === "refunded") return "neutral";
  return "warning";
}

function fulfilmentVariant(status: string): BadgeVariant {
  if (status === "fulfilled") return "success";
  if (status === "partially_fulfilled") return "info";
  return "neutral";
}

function fulfilmentLabel(status: string, copy: ShopCopy): string {
  if (status === "fulfilled") return copy.fulfilmentFulfilled;
  if (status === "partially_fulfilled") return copy.fulfilmentPartial;
  return copy.fulfilmentUnfulfilled;
}

function formatDate(
  iso: string | null | undefined,
  locale: string,
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function OrderTimeline({
  order,
  copy,
  locale,
}: {
  order: Order;
  copy: ShopCopy;
  locale: string;
}) {
  const stages = [
    { label: copy.timelinePlaced, at: order.createdAt, done: true },
    {
      label: copy.timelinePaid,
      at: order.paidAt,
      done: Boolean(order.paidAt),
    },
    {
      label: copy.timelineDispatched,
      at: order.fulfilledAt,
      done: Boolean(order.fulfilledAt),
    },
    {
      label: copy.timelineDelivered,
      at: order.deliveredAt,
      done: Boolean(order.deliveredAt),
    },
  ];

  return (
    <div className={`shop-card ${styles.timeline}`}>
      <div className={styles.timelineTitle}>{copy.statusHistory}</div>
      {stages.map((stage, index) => {
        const date = formatDate(stage.at, locale);
        return (
          <div key={stage.label} className={styles.timelineItem}>
            <div className={styles.timelineRail}>
              <span
                className={`${styles.dot} ${
                  stage.done ? styles.dotDone : styles.dotPending
                }`}
              />
              {index < stages.length - 1 ? (
                <span className={styles.timelineLine} />
              ) : null}
            </div>
            <div className={styles.timelineBody}>
              <div
                className={
                  stage.done ? styles.timelineLabel : styles.timelineLabelMuted
                }
              >
                {stage.label}
              </div>
              <div className={styles.timelineTime}>
                {date ?? copy.timelinePending}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Shipment = Order["shipments"][number] & {
  status: Exclude<Order["shipments"][number]["status"], "canceled">;
};
type ShipmentStatus = Shipment["status"];

function isShown(shipment: Order["shipments"][number]): shipment is Shipment {
  return shipment.status !== "canceled";
}

function shipmentVariant(status: ShipmentStatus): BadgeVariant {
  if (status === "delivered") return "success";
  if (status === "exception" || status === "returned_to_sender") {
    return "warning";
  }
  if (status === "pending" || status === "label_purchased") return "neutral";
  return "info";
}

function shipmentLabel(status: ShipmentStatus, copy: ShopCopy): string {
  const labels: Record<ShipmentStatus, string> = {
    pending: copy.shipmentPending,
    label_purchased: copy.shipmentLabelPurchased,
    in_transit: copy.shipmentInTransit,
    out_for_delivery: copy.shipmentOutForDelivery,
    delivered: copy.shipmentDelivered,
    exception: copy.shipmentException,
    returned_to_sender: copy.shipmentReturned,
  };
  return labels[status];
}

function ShipmentTracking({ shipment }: { shipment: Shipment }) {
  const text = [shipment.carrier, shipment.trackingNumber]
    .filter(Boolean)
    .join(" ");
  if (!text) return null;
  if (!shipment.trackingUrl) {
    return <span className={styles.tracking}>{text}</span>;
  }
  return (
    <a
      className={styles.tracking}
      href={shipment.trackingUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      {text}
    </a>
  );
}

export function AccountOrder({
  order,
  payOnline,
  paid,
  orderFields,
}: {
  order: Order;
  payOnline: boolean;
  paid: boolean;
  orderFields: OrderField[];
}) {
  const localePath = useLocalePath();
  const { locale, defaultLocale } = useShopLocale();
  const copy = useShopCopy();
  const parcels = order.shipments.filter(isShown);
  const canPay =
    payOnline && order.balanceDue > 0 && order.state !== "canceled";

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>
          {copy.order} {order.orderNumber ? `#${order.orderNumber}` : ""}
        </h1>
        {order.poNumber ? (
          <p className={styles.subtitle}>
            {copy.po} <span className={styles.strong}>{order.poNumber}</span>
          </p>
        ) : null}
      </div>

      <div className={styles.statusStrip}>
        <div className={`shop-card ${styles.statusCard}`}>
          <div className={styles.statusLabel}>{copy.statusPayment}</div>
          <Badge variant={paymentVariant(order.paymentStatus)}>
            {paymentLabel(order, copy, payOnline)}
          </Badge>
          {paid && order.balanceDue > 0 ? (
            <p className="shop-muted">
              {copy.paymentConfirming}{" "}
              <Link href={localePath(`/order/${order.id}`)}>
                {copy.checkOrderStatus}
              </Link>
            </p>
          ) : null}
        </div>
        <div className={`shop-card ${styles.statusCard}`}>
          <div className={styles.statusLabel}>{copy.statusFulfilment}</div>
          <Badge variant={fulfilmentVariant(order.fulfillmentStatus)}>
            {fulfilmentLabel(order.fulfillmentStatus, copy)}
          </Badge>
        </div>
        <div className={`shop-card ${styles.statusCard}`}>
          <div className={styles.statusLabel}>{copy.statusTracking}</div>
          {parcels.length > 0 ? (
            parcels.map((shipment, index) => (
              <div key={index} className={styles.shipment}>
                <Badge variant={shipmentVariant(shipment.status)}>
                  {shipmentLabel(shipment.status, copy)}
                </Badge>
                <ShipmentTracking shipment={shipment} />
              </div>
            ))
          ) : (
            <div className="shop-muted">{copy.noTrackingYet}</div>
          )}
        </div>
      </div>

      <div className={styles.detailGrid}>
        <OrderReceipt order={order} copy={copy} locale={locale} />
        <OrderTimeline order={order} copy={copy} locale={locale} />
      </div>

      <OrderReturns order={order} />

      <OrderCustomFields
        values={order.customFields}
        fields={orderFields}
        locale={{ locale, defaultLocale }}
        copy={copy}
      />

      <ReorderButton items={order.items} />

      <div className={styles.actions}>
        {canPay && !paid ? <PayOrderButton orderId={order.id} /> : null}
        {order.invoiceUrl ? (
          <a className={buttonClass("outline")} href={order.invoiceUrl}>
            {copy.downloadInvoice}
          </a>
        ) : null}
        <Link className={buttonClass("ghost")} href={localePath("/account")}>
          {copy.backToOrders}
        </Link>
      </div>
    </div>
  );
}
