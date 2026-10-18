export interface ShippingAddress {
  name: string;
  company: string | null;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  country: string;
  phone: string | null;
}

export interface Parcel {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface ShipmentRequest {
  orderId: string;
  orderNumber: number | null;
  email: string;
  address: ShippingAddress;
  parcel: Parcel;
}

export interface BookedShipment {
  reference: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

export interface ShippingProvider {
  carrier: string;
  book(request: ShipmentRequest): Promise<BookedShipment>;
  resume(reference: string): Promise<BookedShipment>;
}

export type ProviderName = "inpost" | "bring";

export const SHIPPING_ROUTES: ReadonlyArray<{
  methodId: string;
  countries: readonly string[];
  provider: ProviderName;
}> = [
  { methodId: "courier24", countries: ["PL"], provider: "inpost" },
  { methodId: "courier-express", countries: ["PL"], provider: "inpost" },
  { methodId: "bring-home", countries: ["NO"], provider: "bring" },
];

export const DEFAULT_PARCEL: Parcel = {
  weightKg: 5,
  lengthCm: 40,
  widthCm: 30,
  heightCm: 20,
};

export function routeFor(
  methodId: string,
  country: string,
): ProviderName | null {
  const route = SHIPPING_ROUTES.find(
    (candidate) =>
      candidate.methodId === methodId &&
      candidate.countries.includes(country.toUpperCase()),
  );
  return route?.provider ?? null;
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
