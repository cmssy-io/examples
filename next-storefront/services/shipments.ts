import { randomUUID } from "node:crypto";
import {
  referenceFromNote,
  referenceNote,
  routeFor,
  ShippingProviderError,
  type BookedShipment,
  type ProviderName,
  type ShippingAddress,
  type ShippingProvider,
} from "@/lib/shipping";
import { shippoFromEnv } from "@/lib/shippo";
import {
  adminRequest,
  errorText,
  isRefusal,
  type AdminResult,
} from "@/services/admin";

const ORDER_FOR_SHIPPING = `
  query OrderForShipping($id: ID!) {
    order {
      get(id: $id) {
        id
        orderNumber
        customerEmail
        paymentStatus
        currency
        items { name sku quantity price }
        shippingMethod { id }
        shippingAddress {
          name
          company
          line1
          line2
          postalCode
          city
          region
          country
          phone
        }
        shipments {
          id
          carrier
          status
          trackingNumber
          idempotencyKey
          events { at note }
        }
      }
    }
  }
`;

const CLAIM_SHIPMENT = `
  mutation ClaimShipment($input: CreateShipmentInput!) {
    order {
      createShipment(input: $input) {
        shipments { id idempotencyKey events { at note } }
      }
    }
  }
`;

const UPDATE_SHIPMENT = `
  mutation UpdateShipment($input: UpdateShipmentInput!) {
    order {
      updateShipment(input: $input) { id }
    }
  }
`;

export const CLAIM_TIMEOUT_MS = 2 * 60_000;
const NOTE_REASON_MAX = 400;

interface ShipmentEventRow {
  at: string;
  note: string | null;
}

interface ShipmentRow {
  id: string;
  carrier: string | null;
  status: string;
  trackingNumber: string | null;
  idempotencyKey: string | null;
  events: ShipmentEventRow[];
}

interface ShippingOrder {
  id: string;
  orderNumber: number | null;
  customerEmail: string;
  paymentStatus: string;
  currency: string;
  items: Array<{
    name: string;
    sku: string | null;
    quantity: number;
    price: number;
  }>;
  shippingMethod: { id: string } | null;
  shippingAddress: ShippingAddress | null;
  shipments: ShipmentRow[];
}

export type ShipOutcome =
  | { skipped: string }
  | { shipped: BookedShipment & { carrier: string } }
  | { pending: { carrier: string; reference: string | null } };

export type ProviderRegistry = Partial<
  Record<ProviderName, ShippingProvider | null>
>;

export function providersFromEnv(): ProviderRegistry {
  return {
    shippo: shippoFromEnv(),
  };
}

export interface ShipDeps {
  providers: ProviderRegistry;
  request: <T>(
    query: string,
    variables: Record<string, unknown>,
    purpose: string,
  ) => Promise<AdminResult<T>>;
  now: () => number;
  claimToken: () => string;
}

const defaultDeps = (): ShipDeps => ({
  providers: providersFromEnv(),
  request: adminRequest,
  now: Date.now,
  claimToken: () => randomUUID(),
});

async function mutate(
  deps: ShipDeps,
  query: string,
  input: Record<string, unknown>,
  purpose: string,
): Promise<void> {
  const { errors } = await deps.request(query, { input }, purpose);
  if (errors.length)
    throw new Error(`cmssy: ${purpose} - ${errorText(errors)}`);
}

export function shipmentKey(
  provider: ProviderName,
  orderId: string,
  carrier: string,
): string {
  return `${provider}:${orderId}:${carrier}`;
}

export function claimNote(carrier: string, token: string): string {
  return `${carrier} booking claimed ${token}`;
}

export function notMadeNote(carrier: string, reason: string): string {
  return `${carrier} booking not made: ${reason.slice(0, NOTE_REASON_MAX)}`;
}

export async function shipOrder(
  orderId: string,
  deps: ShipDeps = defaultDeps(),
): Promise<ShipOutcome> {
  const { data, errors } = await deps.request<{
    order?: { get?: ShippingOrder | null };
  }>(ORDER_FOR_SHIPPING, { id: orderId }, "read the order to ship");
  if (isRefusal(errors)) return { skipped: errorText(errors) };
  if (errors.length) {
    throw new Error(`cmssy: read the order to ship - ${errorText(errors)}`);
  }
  const order = data?.order?.get;
  if (!order) return { skipped: "order not found" };
  if (order.paymentStatus !== "paid") return { skipped: "order is not paid" };
  if (!order.shippingMethod || !order.shippingAddress) {
    return { skipped: "order has no shipping method or address" };
  }

  const route = routeFor(
    order.shippingMethod.id,
    order.shippingAddress.country,
  );
  if (!route) return { skipped: "no provider for this shipping method" };
  const provider = deps.providers[route.provider];
  if (!provider) return { skipped: `${route.provider} is not configured` };
  const { carrier } = route;
  const key = shipmentKey(route.provider, order.id, carrier);
  const address = order.shippingAddress;

  const update = (
    shipmentId: string,
    input: Record<string, unknown>,
    purpose: string,
  ) =>
    mutate(
      deps,
      UPDATE_SHIPMENT,
      { orderId: order.id, shipmentId, ...input },
      purpose,
    );

  const book = async (shipmentId: string): Promise<ShipOutcome> => {
    let booked: BookedShipment;
    try {
      booked = await provider.book({
        orderId: order.id,
        orderNumber: order.orderNumber,
        email: order.customerEmail,
        address,
        parcel: route.parcel,
        service: route.service,
        origin: route.origin,
        currency: order.currency,
        lines: order.items.map((item) => ({
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      });
    } catch (error) {
      if (error instanceof ShippingProviderError) {
        await update(
          shipmentId,
          error.retryable
            ? { note: notMadeNote(carrier, error.message) }
            : {
                status: "exception",
                note: `${carrier} booking refused: ${error.message.slice(0, NOTE_REASON_MAX)}`,
              },
          "record the failed booking",
        );
      }
      throw error;
    }
    await update(
      shipmentId,
      {
        trackingNumber: booked.trackingNumber,
        trackingUrl: booked.trackingUrl,
        note: referenceNote(carrier, booked.reference),
      },
      "record the shipment",
    );
    if (!booked.trackingNumber) {
      return { pending: { carrier, reference: booked.reference } };
    }
    return { shipped: { ...booked, carrier } };
  };

  const claimed = order.shipments.find((s) => s.idempotencyKey === key);
  if (!claimed) {
    if (order.shipments.some((s) => s.carrier === carrier)) {
      return { skipped: "shipment recorded by hand" };
    }
    const note = claimNote(carrier, deps.claimToken());
    const res = await deps.request<{
      order?: { createShipment?: { shipments: ShipmentRow[] } };
    }>(
      CLAIM_SHIPMENT,
      { input: { orderId: order.id, carrier, idempotencyKey: key, note } },
      "claim the shipment",
    );
    if (res.errors.length) {
      throw new Error(`cmssy: claim the shipment - ${errorText(res.errors)}`);
    }
    const mine = res.data?.order?.createShipment?.shipments.find(
      (s) => s.idempotencyKey === key,
    );
    if (!mine)
      throw new Error("cmssy: claim the shipment - no shipment came back");
    if (mine.events[0]?.note !== note) {
      return { pending: { carrier, reference: null } };
    }
    return book(mine.id);
  }

  if (claimed.trackingNumber) return { skipped: "already shipped" };
  if (claimed.status === "exception") {
    return {
      skipped: "the booking needs a person: see the shipment on the order",
    };
  }
  const reference = claimed.events
    .map((event) => referenceFromNote(carrier, event.note))
    .find(Boolean);
  if (reference) {
    const resumed = await provider.resume(reference);
    if (!resumed.trackingNumber) return { pending: { carrier, reference } };
    await update(
      claimed.id,
      {
        trackingNumber: resumed.trackingNumber,
        trackingUrl: resumed.trackingUrl,
      },
      "record the tracking number",
    );
    return { shipped: { ...resumed, carrier } };
  }

  const last = claimed.events[claimed.events.length - 1];
  if (last?.note?.startsWith(notMadeNote(carrier, ""))) return book(claimed.id);
  if (last && deps.now() - Date.parse(last.at) < CLAIM_TIMEOUT_MS) {
    return { pending: { carrier, reference: null } };
  }
  await update(
    claimed.id,
    {
      status: "exception",
      note: `${carrier} booking outcome unknown: check ${carrier} for this order before shipping it by hand`,
    },
    "flag the unfinished booking",
  );
  return { skipped: "booking outcome unknown, flagged on the order" };
}
