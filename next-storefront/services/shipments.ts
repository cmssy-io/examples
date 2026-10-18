import { bringFromEnv } from "@/lib/bring";
import { inpostFromEnv } from "@/lib/inpost";
import {
  DEFAULT_PARCEL,
  referenceFromNote,
  referenceNote,
  routeFor,
  type BookedShipment,
  type ProviderName,
  type ShippingAddress,
  type ShippingProvider,
} from "@/lib/shipping";
import { siteUrl } from "@/lib/site-url";
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
        shippingMethod { id }
        shippingAddress {
          name
          company
          line1
          line2
          postalCode
          city
          country
          phone
        }
        shipments {
          id
          carrier
          trackingNumber
          events { note }
        }
      }
    }
  }
`;

const CREATE_SHIPMENT = `
  mutation CreateShipment($input: CreateShipmentInput!) {
    order {
      createShipment(input: $input) { id }
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

interface ShippingOrder {
  id: string;
  orderNumber: number | null;
  customerEmail: string;
  paymentStatus: string;
  shippingMethod: { id: string } | null;
  shippingAddress: ShippingAddress | null;
  shipments: Array<{
    id: string;
    carrier: string | null;
    trackingNumber: string | null;
    events: Array<{ note: string | null }>;
  }>;
}

export type ShipOutcome =
  | { skipped: string }
  | { shipped: BookedShipment & { carrier: string } }
  | { pending: { carrier: string; reference: string } };

export type ProviderRegistry = Partial<
  Record<ProviderName, ShippingProvider | null>
>;

export function providersFromEnv(): ProviderRegistry {
  return {
    inpost: inpostFromEnv(),
    bring: bringFromEnv(process.env, siteUrl()),
  };
}

export interface ShipDeps {
  providers: ProviderRegistry;
  request: <T>(
    query: string,
    variables: Record<string, unknown>,
    purpose: string,
  ) => Promise<AdminResult<T>>;
}

const defaultDeps = (): ShipDeps => ({
  providers: providersFromEnv(),
  request: adminRequest,
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

  const name = routeFor(order.shippingMethod.id, order.shippingAddress.country);
  if (!name) return { skipped: "no provider for this shipping method" };
  const provider = deps.providers[name];
  if (!provider) return { skipped: `${name} is not configured` };

  const existing = order.shipments.find(
    (shipment) => shipment.carrier === provider.carrier,
  );
  if (existing?.trackingNumber) return { skipped: "already shipped" };

  if (existing) {
    const reference = existing.events
      .map((event) => referenceFromNote(provider.carrier, event.note))
      .find(Boolean);
    if (!reference) return { skipped: "shipment recorded by hand" };
    const resumed = await provider.resume(reference);
    if (!resumed.trackingNumber) {
      return { pending: { carrier: provider.carrier, reference } };
    }
    await mutate(
      deps,
      UPDATE_SHIPMENT,
      {
        orderId: order.id,
        shipmentId: existing.id,
        trackingNumber: resumed.trackingNumber,
        trackingUrl: resumed.trackingUrl,
      },
      "record the tracking number",
    );
    return { shipped: { ...resumed, carrier: provider.carrier } };
  }

  const booked = await provider.book({
    orderId: order.id,
    orderNumber: order.orderNumber,
    email: order.customerEmail,
    address: order.shippingAddress,
    parcel: DEFAULT_PARCEL,
  });
  await mutate(
    deps,
    CREATE_SHIPMENT,
    {
      orderId: order.id,
      carrier: provider.carrier,
      trackingNumber: booked.trackingNumber,
      trackingUrl: booked.trackingUrl,
      note: referenceNote(provider.carrier, booked.reference),
    },
    "record the shipment",
  );
  if (!booked.trackingNumber) {
    return {
      pending: { carrier: provider.carrier, reference: booked.reference },
    };
  }
  return { shipped: { ...booked, carrier: provider.carrier } };
}
