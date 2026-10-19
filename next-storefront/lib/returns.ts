import type {
  OrderReturnStatus,
  ReturnReason,
  ShipmentStatus,
} from "@/graphql/generated/graphql";

export const RETURN_REASONS: readonly ReturnReason[] = [
  "damaged",
  "defective",
  "wrong_item",
  "not_as_described",
  "no_longer_needed",
  "other",
];

const HANDED_OVER: ReadonlySet<ShipmentStatus> = new Set([
  "in_transit",
  "out_for_delivery",
  "delivered",
  "exception",
]);

const VOID_RETURNS: ReadonlySet<OrderReturnStatus> = new Set([
  "rejected",
  "canceled",
]);

export interface ReturnableOrder {
  state: string;
  items: ReadonlyArray<{ id: string; name: string; quantity: number }>;
  shipments: ReadonlyArray<{
    status: ShipmentStatus;
    trackingNumber: string | null;
    items: ReadonlyArray<{ itemId: string; quantity: number }>;
  }>;
  returns: ReadonlyArray<{
    status: OrderReturnStatus;
    lines: ReadonlyArray<{ itemId: string; quantity: number }>;
  }>;
}

export interface ReturnableLine {
  itemId: string;
  name: string;
  returnable: number;
}

function add(
  into: Map<string, number>,
  lines: ReadonlyArray<{ itemId: string; quantity: number }>,
): void {
  for (const line of lines) {
    into.set(line.itemId, (into.get(line.itemId) ?? 0) + line.quantity);
  }
}

export function returnableLines(order: ReturnableOrder): ReturnableLine[] {
  if (order.state === "canceled") return [];
  const handedOver = new Map<string, number>();
  for (const shipment of order.shipments) {
    const unlabelled =
      shipment.status === "exception" && !shipment.trackingNumber;
    if (HANDED_OVER.has(shipment.status) && !unlabelled) {
      add(handedOver, shipment.items);
    }
  }
  const returned = new Map<string, number>();
  for (const ret of order.returns) {
    if (!VOID_RETURNS.has(ret.status)) add(returned, ret.lines);
  }
  return order.items.flatMap((item) => {
    const returnable =
      Math.min(handedOver.get(item.id) ?? 0, item.quantity) -
      (returned.get(item.id) ?? 0);
    return returnable > 0
      ? [{ itemId: item.id, name: item.name, returnable }]
      : [];
  });
}
