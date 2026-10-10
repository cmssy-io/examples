const DEFAULT_CURRENCY = "EUR";

export function formatMoney(
  amount: number,
  currency: string | null = DEFAULT_CURRENCY,
): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currency ?? DEFAULT_CURRENCY,
  }).format(amount);
}

export function skuCode(sku: string | null | undefined): string {
  if (!sku) return "—";
  const prefix = sku.split(/[-\s]/)[0];
  return prefix ? prefix.toUpperCase() : "—";
}
