"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type {
  OrderReturnStatus,
  ReturnLineInput,
  ReturnReason,
} from "@/graphql/generated/graphql";
import type { Order } from "@/graphql/types";
import { requestReturnAction } from "@/lib/actions/orders";
import { actionErrorMessage } from "@/lib/action-errors";
import { RETURN_REASONS, returnableLines } from "@/lib/returns";
import { fill, type ShopCopy } from "@/lib/shop-copy";
import type { BadgeVariant } from "./ui/badge";
import { Badge } from "./ui/badge";
import { useMoney, useShopCopy } from "./locale-ui";
import styles from "./order.module.css";

type ReturnsOrder = Pick<
  Order,
  "id" | "state" | "currency" | "items" | "shipments" | "returns"
>;
type OrderReturn = ReturnsOrder["returns"][number];

const STATUS_COPY: Record<OrderReturnStatus, keyof ShopCopy> = {
  requested: "returnStatusRequested",
  approved: "returnStatusApproved",
  rejected: "returnStatusRejected",
  canceled: "returnStatusCanceled",
  received: "returnStatusReceived",
  completed: "returnStatusCompleted",
};

const REASON_COPY: Record<ReturnReason, keyof ShopCopy> = {
  damaged: "returnReasonDamaged",
  defective: "returnReasonDefective",
  wrong_item: "returnReasonWrongItem",
  not_as_described: "returnReasonNotAsDescribed",
  no_longer_needed: "returnReasonNoLongerNeeded",
  other: "returnReasonOther",
};

function statusVariant(status: OrderReturnStatus): BadgeVariant {
  if (status === "completed") return "success";
  if (status === "rejected" || status === "canceled") return "neutral";
  if (status === "requested") return "warning";
  return "info";
}

function ReturnCard({
  ret,
  order,
  copy,
}: {
  ret: OrderReturn;
  order: ReturnsOrder;
  copy: ShopCopy;
}) {
  const money = useMoney(order.currency);
  const names = new Map(order.items.map((item) => [item.id, item.name]));
  const tracking = [ret.carrier, ret.trackingNumber].filter(Boolean).join(" ");
  return (
    <div className={styles.returnCard}>
      <div className={styles.shipment}>
        <span className={styles.strong}>
          {fill(copy.returnNumber, { number: ret.number })}
        </span>
        <Badge variant={statusVariant(ret.status)}>
          {copy[STATUS_COPY[ret.status]]}
        </Badge>
        {tracking ? <span className={styles.tracking}>{tracking}</span> : null}
      </div>
      <ul className={styles.returnLines}>
        {ret.lines.map((line) => (
          <li key={line.itemId}>
            {line.quantity} × {names.get(line.itemId) ?? line.itemId} ·{" "}
            {copy[REASON_COPY[line.reason]]}
            {line.receivedQuantity !== null ? (
              <span className="shop-muted">
                {" · "}
                {fill(copy.returnReceivedUnits, {
                  received: line.receivedQuantity,
                  quantity: line.quantity,
                })}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {ret.refundedAmount > 0 ? (
        <div className="shop-muted">
          {fill(copy.returnRefunded, {
            amount: money(ret.refundedAmount),
          })}
        </div>
      ) : null}
    </div>
  );
}

function ReturnRequestForm({
  order,
  accessToken,
  copy,
}: {
  order: ReturnsOrder;
  accessToken?: string;
  copy: ShopCopy;
}) {
  const router = useRouter();
  const lines = returnableLines(order);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (lines.length === 0) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const requested: ReturnLineInput[] = lines.map((line) => ({
      itemId: line.itemId,
      quantity: Number(form.get(`quantity-${line.itemId}`) ?? 0),
      reason: String(form.get(`reason-${line.itemId}`)) as ReturnReason,
    }));
    setPending(true);
    setError(null);
    try {
      const result = await requestReturnAction({
        orderId: order.id,
        accessToken,
        lines: requested,
        note: String(form.get("note") ?? "").trim() || undefined,
      });
      if ("error" in result) throw new Error(result.error);
      setDone(true);
      router.refresh();
    } catch (cause) {
      setError(actionErrorMessage(cause, copy.returnRequestFailed));
    } finally {
      setPending(false);
    }
  }

  if (done) return <p className="shop-muted">{copy.returnRequested}</p>;

  return (
    <form className={styles.returnForm} onSubmit={submit}>
      <div className={styles.timelineTitle}>{copy.returnItems}</div>
      <p className="shop-muted">{copy.returnRequestIntro}</p>
      {lines.map((line) => (
        <fieldset key={line.itemId} className={styles.returnLine}>
          <legend className={styles.strong}>{line.name}</legend>
          <label className="shop-label" htmlFor={`quantity-${line.itemId}`}>
            {copy.returnQuantity}
          </label>
          <select
            id={`quantity-${line.itemId}`}
            name={`quantity-${line.itemId}`}
            className="shop-input"
            defaultValue="0"
          >
            {Array.from({ length: line.returnable + 1 }, (_, count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
          <label className="shop-label" htmlFor={`reason-${line.itemId}`}>
            {copy.returnReason}
          </label>
          <select
            id={`reason-${line.itemId}`}
            name={`reason-${line.itemId}`}
            className="shop-input"
            defaultValue="no_longer_needed"
          >
            {RETURN_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {copy[REASON_COPY[reason]]}
              </option>
            ))}
          </select>
        </fieldset>
      ))}
      <label className="shop-label" htmlFor="return-note">
        {copy.returnNote}
      </label>
      <textarea
        id="return-note"
        name="note"
        className="shop-input"
        rows={3}
        maxLength={1000}
      />
      <div>
        <button
          type="submit"
          className="shop-btn shop-btn-primary"
          disabled={pending}
        >
          {pending ? copy.returnSubmitting : copy.returnSubmit}
        </button>
      </div>
      {error ? <span className="shop-error">{error}</span> : null}
    </form>
  );
}

export function OrderReturns({
  order,
  accessToken,
}: {
  order: ReturnsOrder;
  accessToken?: string;
}) {
  const copy = useShopCopy();
  if (order.returns.length === 0 && returnableLines(order).length === 0) {
    return null;
  }
  return (
    <div className={`shop-card ${styles.returns}`}>
      {order.returns.length > 0 ? (
        <>
          <div className={styles.timelineTitle}>{copy.returns}</div>
          {order.returns.map((ret) => (
            <ReturnCard key={ret.id} ret={ret} order={order} copy={copy} />
          ))}
        </>
      ) : null}
      <ReturnRequestForm order={order} accessToken={accessToken} copy={copy} />
    </div>
  );
}
