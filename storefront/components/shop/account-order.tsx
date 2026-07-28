"use client";

import Link from "next/link";
import type { Order } from "@/graphql/types";
import { OrderReceipt, paymentLabel } from "./order-receipt";
import type { BadgeVariant } from "./ui/badge";
import { Badge } from "./ui/badge";
import { buttonClass } from "./ui/button";
import { useLocalePath, useShopCopy } from "./locale-ui";
import type { ShopCopy } from "@/lib/shop-copy";
import styles from "./order.module.css";

function paymentVariant(status: string | undefined): BadgeVariant {
  if (status === "paid") return "success";
  if (status === "refunded") return "neutral";
  return "warning";
}

function fulfilmentVariant(status: string | undefined): BadgeVariant {
  if (status === "fulfilled" || status === "shipped") return "success";
  if (status === "processing" || status === "picking") return "info";
  return "neutral";
}

function fulfilmentLabel(status: string | undefined, copy: ShopCopy): string {
  const labels: Record<string, string> = {
    fulfilled: copy.fulfilmentFulfilled,
    shipped: copy.fulfilmentFulfilled,
    processing: copy.fulfilmentProcessing,
    picking: copy.fulfilmentProcessing,
  };
  return labels[status ?? ""] ?? copy.fulfilmentUnfulfilled;
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function OrderTimeline({ order, copy }: { order: Order; copy: ShopCopy }) {

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
  ];

  return (
    <div className={`shop-card ${styles.timeline}`}>
      <div className={styles.timelineTitle}>{copy.statusHistory}</div>
      {stages.map((stage, index) => {
        const date = formatDate(stage.at);
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

export function AccountOrder({ order }: { order: Order }) {
  const localePath = useLocalePath();
  const copy = useShopCopy();

  const tracking = order.trackingNumber
    ? [order.trackingCarrier, order.trackingNumber].filter(Boolean).join(" ")
    : null;

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
            {paymentLabel(order, copy)}
          </Badge>
        </div>
        <div className={`shop-card ${styles.statusCard}`}>
          <div className={styles.statusLabel}>{copy.statusFulfilment}</div>
          <Badge variant={fulfilmentVariant(order.fulfillmentStatus)}>
            {fulfilmentLabel(order.fulfillmentStatus, copy)}
          </Badge>
        </div>
        <div className={`shop-card ${styles.statusCard}`}>
          <div className={styles.statusLabel}>{copy.statusTracking}</div>
          {tracking ? (
            <div className={styles.tracking}>{tracking}</div>
          ) : (
            <div className="shop-muted">{copy.noTrackingYet}</div>
          )}
        </div>
      </div>

      <div className={styles.detailGrid}>
        <OrderReceipt order={order} copy={copy} />
        <OrderTimeline order={order} copy={copy} />
      </div>

      <div className={styles.actions}>
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
