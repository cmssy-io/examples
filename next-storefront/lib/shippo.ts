import {
  ShippingProviderError,
  type BookedShipment,
  type ShipmentRequest,
  type ShippingProvider,
} from "@/lib/shipping";

const API_URL = "https://api.goshippo.com";
const NAME = "Shippo";

const EU_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
]);

export const SHIPPO_ORIGINS = {
  us: { env: "SHIPPO_ADDRESS_FROM_US", country: "US" },
  de: { env: "SHIPPO_ADDRESS_FROM_DE", country: "DE" },
} as const;

export interface ShippoOrigin {
  addressId: string;
  country: string;
}

export interface ShippoOptions {
  token: string;
  origins: Record<string, ShippoOrigin>;
  customsSigner: string | null;
  fetch?: typeof fetch;
}

interface ShippoMessage {
  source?: string;
  text?: string;
}

interface ShippoShipment {
  rates?: Array<{ object_id: string; servicelevel?: { token?: string } }>;
  messages?: ShippoMessage[];
}

interface ShippoTransaction {
  object_id: string;
  status: string;
  tracking_number?: string | null;
  tracking_url_provider?: string | null;
  messages?: ShippoMessage[];
}

export function shippoFromEnv(
  env: Record<string, string | undefined> = process.env,
): ShippingProvider | null {
  const token = env.SHIPPO_API_TOKEN;
  if (!token) return null;
  const origins: Record<string, ShippoOrigin> = {};
  for (const [key, origin] of Object.entries(SHIPPO_ORIGINS)) {
    const addressId = env[origin.env];
    if (addressId) origins[key] = { addressId, country: origin.country };
  }
  return createShippo({
    token,
    origins,
    customsSigner: env.SHIPPO_CUSTOMS_SIGNER || null,
  });
}

export function needsCustoms(from: string, to: string): boolean {
  if (from === to) return false;
  return !(EU_COUNTRIES.has(from) && EU_COUNTRIES.has(to));
}

function decimal(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}

function messageText(messages: ShippoMessage[] | undefined): string {
  return (messages ?? [])
    .map((message) => message.text)
    .filter(Boolean)
    .join("; ");
}

function carrierKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function carrierMessages(
  messages: ShippoMessage[] | undefined,
  service: string,
): ShippoMessage[] | undefined {
  const target = carrierKey(service);
  const own = (messages ?? []).filter((message) => {
    const source = carrierKey(message.source ?? "");
    return source !== "" && target.startsWith(source);
  });
  return own.length > 0 ? own : messages;
}

const REGION_REQUIRED = new Set(["US", "CA", "AU"]);

function refuse(message: string): never {
  throw new ShippingProviderError(NAME, message, false);
}

function customsDeclaration(
  request: ShipmentRequest,
  origin: ShippoOrigin,
  signer: string,
) {
  const units = request.lines.reduce((sum, line) => sum + line.quantity, 0);
  if (units === 0) refuse("customs needs at least one order line");
  return {
    contents_type: "MERCHANDISE",
    non_delivery_option: "RETURN",
    certify: true,
    certify_signer: signer,
    incoterm: "DDU",
    invoice: request.orderNumber
      ? `#${request.orderNumber}`
      : `#${request.orderId}`,
    items: request.lines.map((line) => ({
      description: line.name,
      quantity: line.quantity,
      net_weight: Math.max(
        (request.parcel.weightKg * line.quantity) / units,
        0.001,
      ).toFixed(3),
      mass_unit: "kg",
      value_amount: decimal(line.unitPrice * line.quantity),
      value_currency: request.currency,
      origin_country: origin.country,
      ...(line.sku ? { sku_code: line.sku } : {}),
    })),
  };
}

export function createShippo(options: ShippoOptions): ShippingProvider {
  const fetchImpl = options.fetch ?? fetch;

  async function call<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetchImpl(`${API_URL}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        authorization: `ShippoToken ${options.token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const json = (await response.json().catch(() => null)) as
      (T & { detail?: string }) | null;
    if (!response.ok || !json) {
      throw new ShippingProviderError(
        NAME,
        `${response.status} ${json?.detail ?? (json ? JSON.stringify(json) : "request failed")}`,
        response.status >= 500 || response.status === 429,
      );
    }
    return json;
  }

  function booked(transaction: ShippoTransaction): BookedShipment {
    if (transaction.status === "ERROR") {
      refuse(messageText(transaction.messages) || "label purchase failed");
    }
    if (transaction.status !== "SUCCESS") {
      return {
        reference: transaction.object_id,
        trackingNumber: null,
        trackingUrl: null,
      };
    }
    return {
      reference: transaction.object_id,
      trackingNumber: transaction.tracking_number || null,
      trackingUrl: transaction.tracking_url_provider || null,
    };
  }

  return {
    name: NAME,

    async book(request: ShipmentRequest) {
      if (!request.service || !request.origin) {
        refuse("the route names no service or origin");
      }
      const origin = options.origins[request.origin];
      if (!origin) refuse(`no "${request.origin}" sender address configured`);
      const { address, parcel } = request;
      const destination = address.country.toUpperCase();
      if (REGION_REQUIRED.has(destination) && !address.region) {
        refuse(`an address in ${destination} needs a state or region`);
      }
      let customs: ReturnType<typeof customsDeclaration> | undefined;
      if (needsCustoms(origin.country, destination)) {
        if (!options.customsSigner) {
          refuse("SHIPPO_CUSTOMS_SIGNER is required to declare customs");
        }
        customs = customsDeclaration(request, origin, options.customsSigner);
      }
      const reference = request.orderNumber
        ? `Order ${request.orderNumber}`
        : `Order ${request.orderId}`;

      const shipment = await call<ShippoShipment>("/shipments/", {
        address_from: origin.addressId,
        address_to: {
          name: address.name,
          ...(address.company ? { company: address.company } : {}),
          street1: address.line1,
          ...(address.line2 ? { street2: address.line2 } : {}),
          city: address.city,
          ...(address.region ? { state: address.region } : {}),
          zip: address.postalCode,
          country: destination,
          ...(address.phone ? { phone: address.phone } : {}),
          email: request.email,
        },
        parcels: [
          {
            length: String(parcel.lengthCm),
            width: String(parcel.widthCm),
            height: String(parcel.heightCm),
            distance_unit: "cm",
            weight: String(parcel.weightKg),
            mass_unit: "kg",
          },
        ],
        ...(customs ? { customs_declaration: customs } : {}),
        metadata: reference,
        async: false,
      });
      const rate = shipment.rates?.find(
        (candidate) => candidate.servicelevel?.token === request.service,
      );
      if (!rate) {
        const reason = messageText(
          carrierMessages(shipment.messages, request.service),
        );
        refuse(`no ${request.service} rate${reason ? `: ${reason}` : ""}`);
      }

      return booked(
        await call<ShippoTransaction>("/transactions/", {
          rate: rate.object_id,
          label_file_type: "PDF",
          metadata: reference,
          async: false,
        }),
      );
    },

    async resume(reference: string) {
      return booked(
        await call<ShippoTransaction>(
          `/transactions/${encodeURIComponent(reference)}`,
        ),
      );
    },
  };
}
