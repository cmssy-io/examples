import { randomUUID } from "node:crypto";
import {
  referenceFromNote,
  referenceNote,
  routeFor,
  ShippingProviderError,
  trackingCarrierFor,
  type BookedShipment,
  type ProviderName,
  type ShippingAddress,
  type ShippingProvider,
} from "@/lib/shipping";
import { shippoFromEnv, type ShippoEvent } from "@/lib/shippo";
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
  updatedAt?: string;
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

export interface ShipOptions {
  retryOf?: string;
}

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
  attempt = 1,
): string {
  const key = `${provider}:${orderId}:${carrier}`;
  return attempt === 1 ? key : `${key}:${attempt}`;
}

export function attemptOf(key: string | null, base: string): number | null {
  if (key === base) return 1;
  if (!key?.startsWith(`${base}:`)) return null;
  const attempt = Number(key.slice(base.length + 1));
  return Number.isInteger(attempt) && attempt > 1 ? attempt : null;
}

export function claimNote(carrier: string, token: string): string {
  return `${carrier} booking claimed ${token}`;
}

async function follow(
  provider: ShippingProvider,
  trackingCarrier: string,
  trackingNumber: string | null,
  key: string,
): Promise<void> {
  if (!trackingNumber) return;
  try {
    await provider.track({
      carrier: trackingCarrier,
      trackingNumber,
      metadata: key,
    });
  } catch (error) {
    console.warn(
      `${provider.name}: tracking not registered for ${trackingNumber}`,
      error instanceof Error ? error.message : error,
    );
  }
}

export function notMadeNote(carrier: string, reason: string): string {
  return `${carrier} booking not made: ${reason.slice(0, NOTE_REASON_MAX)}`;
}

export async function shipOrder(
  orderId: string,
  deps: ShipDeps = defaultDeps(),
  options: ShipOptions = {},
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
  const base = shipmentKey(route.provider, order.id, carrier);
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

  const book = async (
    shipmentId: string,
    key: string,
  ): Promise<ShipOutcome> => {
    let booked: BookedShipment;
    try {
      booked = await provider.book({
        key,
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
        labelUrl: booked.labelUrl,
        ...(booked.trackingNumber ? { status: "label_purchased" } : {}),
        note: referenceNote(carrier, booked.reference),
      },
      "record the shipment",
    );
    await follow(provider, route.trackingCarrier, booked.trackingNumber, key);
    if (!booked.trackingNumber) {
      return { pending: { carrier, reference: booked.reference } };
    }
    return { shipped: { ...booked, carrier } };
  };

  const claim = async (key: string): Promise<ShipOutcome> => {
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
    return book(mine.id, key);
  };

  const attempts = order.shipments
    .map((shipment) => ({
      shipment,
      attempt: attemptOf(shipment.idempotencyKey, base),
    }))
    .filter(
      (entry): entry is { shipment: ShipmentRow; attempt: number } =>
        entry.attempt !== null,
    )
    .sort((a, b) => a.attempt - b.attempt);
  const latest = attempts[attempts.length - 1];

  const byHand = order.shipments.some(
    (s) => s.carrier === carrier && attemptOf(s.idempotencyKey, base) === null,
  );

  if (!latest) {
    if (byHand) return { skipped: "shipment recorded by hand" };
    return claim(base);
  }

  const claimed = latest.shipment;
  if (claimed.trackingNumber) return { skipped: "already shipped" };
  if (claimed.status === "exception" || claimed.status === "canceled") {
    if (options.retryOf === claimed.id && claimed.status === "canceled") {
      if (byHand) return { skipped: "shipment recorded by hand" };
      return claim(
        shipmentKey(route.provider, order.id, carrier, latest.attempt + 1),
      );
    }
    return {
      skipped:
        claimed.status === "canceled"
          ? "the last booking was canceled"
          : "the booking needs a person: see the shipment on the order",
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
        labelUrl: resumed.labelUrl,
        status: "label_purchased",
      },
      "record the tracking number",
    );
    await follow(
      provider,
      route.trackingCarrier,
      resumed.trackingNumber,
      claimed.idempotencyKey!,
    );
    return { shipped: { ...resumed, carrier } };
  }

  const last = claimed.events[claimed.events.length - 1];
  if (last?.note?.startsWith(notMadeNote(carrier, ""))) return book(claimed.id, claimed.idempotencyKey!);
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

const SHIPMENTS_FOR_TRACKING = `
  query ShipmentsForTracking($id: ID!) {
    order {
      get(id: $id) {
        id
        shipments {
          id
          carrier
          status
          trackingNumber
          idempotencyKey
          updatedAt
          events { at note }
        }
      }
    }
  }
`;

const PROGRESS = [
  "pending",
  "label_purchased",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

export type TrackOutcome = { applied: string } | { skipped: string };

export function orderIdFromKey(key: string): string | null {
  const [provider, orderId] = key.split(":");
  return provider === "shippo" && orderId ? orderId : null;
}

export function refundNote(reference: string): string {
  return `Label ${reference} was bought for this canceled attempt: refund it in Shippo`;
}

function movesBack(from: string, to: string): boolean {
  if (from === "delivered" || from === "returned_to_sender") {
    return to !== "returned_to_sender";
  }
  if (to === "pending") return true;
  const fromRank = PROGRESS.indexOf(from);
  const toRank = PROGRESS.indexOf(to);
  return fromRank !== -1 && toRank !== -1 && toRank < fromRank;
}

export async function applyShippoEvent(
  event: ShippoEvent,
  deps: ShipDeps = defaultDeps(),
): Promise<TrackOutcome> {
  const orderId = orderIdFromKey(event.key);
  if (!orderId) return { skipped: "not a parcel this app booked" };
  const { data, errors } = await deps.request<{
    order?: { get?: { id: string; shipments: ShipmentRow[] } | null };
  }>(SHIPMENTS_FOR_TRACKING, { id: orderId }, "read the parcel to track");
  if (isRefusal(errors)) return { skipped: errorText(errors) };
  if (errors.length) {
    throw new Error(`cmssy: read the parcel to track - ${errorText(errors)}`);
  }
  const shipment = data?.order?.get?.shipments.find(
    (s) => s.idempotencyKey === event.key,
  );
  if (!shipment) return { skipped: "no parcel holds this key" };
  const update = (input: Record<string, unknown>, purpose: string) =>
    mutate(
      deps,
      UPDATE_SHIPMENT,
      {
        orderId,
        shipmentId: shipment.id,
        expectedUpdatedAt: shipment.updatedAt,
        ...input,
      },
      purpose,
    );

  if (event.kind === "label") {
    if (shipment.status === "canceled") {
      const note = refundNote(event.reference);
      if (shipment.events.some((e) => e.note === note)) {
        return { skipped: "the extra label is already flagged" };
      }
      await update({ note }, "flag the extra label");
      return { applied: "extra label flagged for a refund" };
    }
    if (shipment.trackingNumber) {
      return { skipped: "the label is already recorded" };
    }
    const carrier = shipment.carrier ?? "Shippo";
    await update(
      {
        trackingNumber: event.trackingNumber,
        trackingUrl: event.trackingUrl,
        labelUrl: event.labelUrl,
        status: "label_purchased",
        note: referenceNote(carrier, event.reference),
      },
      "record the recovered label",
    );
    const provider = deps.providers.shippo;
    const trackingCarrier = trackingCarrierFor("shippo", shipment.carrier);
    if (provider && trackingCarrier) {
      await follow(provider, trackingCarrier, event.trackingNumber, event.key);
    }
    return { applied: "label recorded" };
  }

  if (shipment.trackingNumber !== event.trackingNumber) {
    return { skipped: "the tracking number is not this parcel's" };
  }
  if (!event.status) return { skipped: "the carrier status is unknown" };
  if (shipment.status === "canceled") {
    return { skipped: "the parcel was canceled" };
  }
  if (event.status === shipment.status) {
    return { skipped: "the status is unchanged" };
  }
  if (movesBack(shipment.status, event.status)) {
    return { skipped: `the parcel is already ${shipment.status}` };
  }
  await update(
    {
      status: event.status,
      ...(event.details
        ? { note: event.details.slice(0, NOTE_REASON_MAX) }
        : {}),
    },
    "record the carrier status",
  );
  return { applied: event.status };
}
