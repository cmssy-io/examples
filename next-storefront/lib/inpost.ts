import {
  ShippingProviderError,
  splitName,
  splitStreet,
  type BookedShipment,
  type ShipmentRequest,
  type ShippingProvider,
} from "@/lib/shipping";

const SANDBOX_URL = "https://sandbox-api-shipx-pl.easypack24.net";
const PRODUCTION_URL = "https://api-shipx-pl.easypack24.net";
const CARRIER = "InPost";

export interface InpostOptions {
  token: string;
  organizationId: string;
  sandbox: boolean;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  pollAttempts?: number;
  pollIntervalMs?: number;
}

interface ShipxShipment {
  id: number;
  status: string;
  tracking_number: string | null;
}

export function inpostTrackingUrl(trackingNumber: string): string {
  return `https://inpost.pl/sledzenie-przesylek?number=${encodeURIComponent(trackingNumber)}`;
}

export function inpostFromEnv(
  env: Record<string, string | undefined> = process.env,
): ShippingProvider | null {
  const token = env.INPOST_API_TOKEN;
  const organizationId = env.INPOST_ORGANIZATION_ID;
  if (!token || !organizationId) return null;
  return createInpost({
    token,
    organizationId,
    sandbox: env.INPOST_SANDBOX !== "false",
  });
}

export function createInpost(options: InpostOptions): ShippingProvider {
  const base = options.sandbox ? SANDBOX_URL : PRODUCTION_URL;
  const fetchImpl = options.fetch ?? fetch;
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const attempts = options.pollAttempts ?? 8;
  const interval = options.pollIntervalMs ?? 1500;

  async function call(path: string, init?: RequestInit): Promise<unknown> {
    const response = await fetchImpl(`${base}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${options.token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
    });
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      details?: unknown;
    } | null;
    if (!response.ok) {
      const detail = body?.details ? ` ${JSON.stringify(body.details)}` : "";
      throw new ShippingProviderError(
        CARRIER,
        `${response.status} ${body?.message ?? "request failed"}${detail}`,
        response.status >= 500 || response.status === 429,
      );
    }
    return body;
  }

  function booked(shipment: ShipxShipment): BookedShipment {
    const trackingNumber = shipment.tracking_number || null;
    return {
      reference: String(shipment.id),
      trackingNumber,
      trackingUrl: trackingNumber ? inpostTrackingUrl(trackingNumber) : null,
    };
  }

  async function waitForTracking(id: string): Promise<BookedShipment> {
    let latest: BookedShipment = {
      reference: id,
      trackingNumber: null,
      trackingUrl: null,
    };
    for (let attempt = 0; attempt < attempts; attempt++) {
      latest = booked(
        (await call(
          `/v1/shipments/${encodeURIComponent(id)}`,
        )) as ShipxShipment,
      );
      if (latest.trackingNumber) return latest;
      await sleep(interval);
    }
    return latest;
  }

  return {
    carrier: CARRIER,

    async book(request: ShipmentRequest) {
      const { address, parcel } = request;
      const street = splitStreet(address.line1);
      if (!street) {
        throw new ShippingProviderError(
          CARRIER,
          `cannot read a building number from "${address.line1}"`,
          false,
        );
      }
      const person = splitName(address.name);
      const created = (await call(
        `/v1/organizations/${encodeURIComponent(options.organizationId)}/shipments`,
        {
          method: "POST",
          body: JSON.stringify({
            receiver: {
              ...(address.company ? { company_name: address.company } : {}),
              first_name: person.first,
              last_name: person.last,
              email: request.email,
              phone: address.phone ?? "",
              address: {
                street: street.street,
                building_number: street.buildingNumber,
                city: address.city,
                post_code: address.postalCode,
                country_code: address.country.toUpperCase(),
              },
            },
            parcels: [
              {
                dimensions: {
                  length: parcel.lengthCm * 10,
                  width: parcel.widthCm * 10,
                  height: parcel.heightCm * 10,
                  unit: "mm",
                },
                weight: { amount: parcel.weightKg, unit: "kg" },
                is_non_standard: false,
              },
            ],
            service: "inpost_courier_standard",
            reference: request.orderNumber
              ? `Order ${request.orderNumber}`
              : `Order ${request.orderId}`,
          }),
        },
      )) as ShipxShipment;
      const first = booked(created);
      if (first.trackingNumber) return first;
      return waitForTracking(first.reference);
    },

    resume(reference: string) {
      return waitForTracking(reference);
    },
  };
}
