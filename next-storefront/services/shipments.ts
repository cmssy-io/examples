import { inpostFromEnv } from "@/lib/inpost";
import {
  referenceFromNote,
  referenceNote,
  routeFor,
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
  currency: string;
  items: Array<{
    name: string;
    sku: string | null;
    quantity: number;
    price: number;
  }>;
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

  const route = routeFor(
    order.shippingMethod.id,
    order.shippingAddress.country,
  );
  if (!route) return { skipped: "no provider for this shipping method" };
  const provider = deps.providers[route.provider];
  if (!provider) return { skipped: `${route.provider} is not configured` };
  const { carrier } = route;

  const existing = order.shipments.find(
    (shipment) => shipment.carrier === carrier,
  );
  if (existing?.trackingNumber) return { skipped: "already shipped" };

  if (existing) {
    const reference = existing.events
      .map((event) => referenceFromNote(carrier, event.note))
      .find(Boolean);
    if (!reference) return { skipped: "shipment recorded by hand" };
    const resumed = await provider.resume(reference);
    if (!resumed.trackingNumber) {
      return { pending: { carrier, reference } };
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
    return { shipped: { ...resumed, carrier } };
  }

  const booked = await provider.book({
    orderId: order.id,
    orderNumber: order.orderNumber,
    email: order.customerEmail,
    address: order.shippingAddress,
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
  await mutate(
    deps,
    CREATE_SHIPMENT,
    {
      orderId: order.id,
      carrier,
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
}
