import type { PriceTier } from "./catalog";

export function formatMoney(
  minorUnits: number,
  currency: string | null,
  locale: string,
): string {
  const options: Intl.NumberFormatOptions = currency
    ? { style: "currency", currency }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return new Intl.NumberFormat(locale, options).format(minorUnits / 100);
}

export function unitPriceFor(
  basePrice: number,
  tiers: PriceTier[],
  quantity: number,
): number {
  let price = basePrice;
  for (const tier of [...tiers].sort((a, b) => a.minQty - b.minQty)) {
    if (quantity >= tier.minQty) price = tier.price;
  }
  return price;
}

export function savingsPercent(basePrice: number, tierPrice: number): number {
  if (basePrice <= 0) return 0;
  return Math.round(((basePrice - tierPrice) / basePrice) * 100);
}

export type StockState = "in" | "low" | "out";

export function stockState(
  inventory: number,
  lowThreshold: number | null,
): StockState {
  if (inventory <= 0) return "out";
  if (lowThreshold !== null && inventory <= lowThreshold) return "low";
  return "in";
}
