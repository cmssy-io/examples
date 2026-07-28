import type { ShippingAddressInput } from "@/graphql/generated/graphql";

const REQUIRED = ["name", "line1", "postalCode", "city", "country"] as const;

export class AddressError extends Error {
  constructor(readonly missing: string[]) {
    super(`shippingAddress is missing: ${missing.join(", ")}`);
    this.name = "AddressError";
  }
}

function trimmed(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseShippingAddress(
  value: unknown,
): ShippingAddressInput | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new AddressError([...REQUIRED]);
  }
  const raw = value as Record<string, unknown>;
  const missing = REQUIRED.filter((key) => !trimmed(raw[key]));
  if (missing.length > 0) throw new AddressError(missing);
  return {
    name: trimmed(raw.name) as string,
    company: trimmed(raw.company),
    line1: trimmed(raw.line1) as string,
    line2: trimmed(raw.line2),
    postalCode: trimmed(raw.postalCode) as string,
    city: trimmed(raw.city) as string,
    region: trimmed(raw.region),
    country: trimmed(raw.country) as string,
    phone: trimmed(raw.phone),
    vatId: trimmed(raw.vatId),
  };
}
