import type { PriceTier } from "./catalog";

const DEFAULT_CURRENCY = "EUR";

export function formatMoney(
  minorUnits: number,
  currency: string | null = DEFAULT_CURRENCY,
): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currency ?? DEFAULT_CURRENCY,
  }).format(minorUnits / 100);
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

export function stockState(inventory: number, lowThreshold = 20): StockState {
  if (inventory <= 0) return "out";
  if (inventory <= lowThreshold) return "low";
  return "in";
}
