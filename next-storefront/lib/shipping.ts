export interface ShippingAddress {
  name: string;
  company: string | null;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  region: string | null;
  country: string;
  phone: string | null;
}

export interface Parcel {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface ShipmentLine {
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
}

export interface ShipmentRequest {
  orderId: string;
  orderNumber: number | null;
  email: string;
  address: ShippingAddress;
  parcel: Parcel;
  service: string | null;
  origin: string | null;
  currency: string;
  lines: ShipmentLine[];
}

export interface BookedShipment {
  reference: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

export interface ShippingProvider {
  name: string;
  book(request: ShipmentRequest): Promise<BookedShipment>;
  resume(reference: string): Promise<BookedShipment>;
}

export type ProviderName = "inpost" | "shippo";

export interface ShippingRoute {
  methodId: string;
  countries: readonly string[];
  provider: ProviderName;
  carrier: string;
  service: string | null;
  origin: string | null;
  parcel: Parcel;
}

export const DEFAULT_PARCEL: Parcel = {
  weightKg: 5,
  lengthCm: 40,
  widthCm: 30,
  heightCm: 20,
};

export const SMALL_PARCEL: Parcel = {
  weightKg: 1.5,
  lengthCm: 30,
  widthCm: 20,
  heightCm: 10,
};

const INTERNATIONAL_EXPRESS = [
  "NO",
  "SE",
  "DK",
  "FI",
  "IS",
  "DE",
  "FR",
  "GB",
  "NL",
  "BE",
  "AT",
  "CH",
  "IE",
  "ES",
  "IT",
  "PL",
] as const;

export const SHIPPING_ROUTES: readonly ShippingRoute[] = [
  {
    methodId: "courier24",
    countries: ["PL"],
    provider: "inpost",
    carrier: "InPost",
    service: null,
    origin: null,
    parcel: DEFAULT_PARCEL,
  },
  {
    methodId: "courier-express",
    countries: ["PL"],
    provider: "inpost",
    carrier: "InPost",
    service: null,
    origin: null,
    parcel: DEFAULT_PARCEL,
  },
  {
    methodId: "us-ground",
    countries: ["US"],
    provider: "shippo",
    carrier: "USPS",
    service: "usps_ground_advantage",
    origin: "us",
    parcel: DEFAULT_PARCEL,
  },
  {
    methodId: "us-priority",
    countries: ["US"],
    provider: "shippo",
    carrier: "USPS",
    service: "usps_priority",
    origin: "us",
    parcel: DEFAULT_PARCEL,
  },
  {
    methodId: "dhl-express",
    countries: INTERNATIONAL_EXPRESS,
    provider: "shippo",
    carrier: "DHL Express",
    service: "dhl_express_worldwide",
    origin: "us",
    parcel: DEFAULT_PARCEL,
  },
  {
    methodId: "nordic-letter",
    countries: ["NO", "SE", "DK", "FI"],
    provider: "shippo",
    carrier: "Deutsche Post",
    service: "deutsche_post_maxibrief_plus",
    origin: "de",
    parcel: SMALL_PARCEL,
  },
];

export function routeFor(
  methodId: string,
  country: string,
): ShippingRoute | null {
  return (
    SHIPPING_ROUTES.find(
      (candidate) =>
        candidate.methodId === methodId &&
        candidate.countries.includes(country.toUpperCase()),
    ) ?? null
  );
}

export function referenceNote(carrier: string, reference: string): string {
  return `${carrier} shipment ${reference}`;
}

export function referenceFromNote(
  carrier: string,
  note: string | null | undefined,
): string | null {
  const prefix = `${carrier} shipment `;
  if (!note?.startsWith(prefix)) return null;
  return note.slice(prefix.length).trim() || null;
}

export class ShippingProviderError extends Error {
  constructor(
    readonly carrier: string,
    message: string,
    readonly retryable: boolean,
  ) {
    super(`${carrier}: ${message}`);
    this.name = "ShippingProviderError";
  }
}

export function splitStreet(line: string): {
  street: string;
  buildingNumber: string;
} | null {
  const match = /^(.*\S)\s+(\d+[\p{L}\d/-]*)$/u.exec(line.trim());
  if (!match) return null;
  return { street: match[1], buildingNumber: match[2] };
}

export function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return { first: parts[0] ?? "", last: parts[0] ?? "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}
