import type {
  CmssyBuyerPrice,
  CmssyPriceDisplayMode,
  CmssyPriceListSource,
  CmssyPriceTier,
  CmssyPriceWithheldReason,
  CmssyTaxTreatmentKind,
  CmssyTaxedAmount,
} from "@cmssy/core";
import type { PriceTier, Product, ProductVariant } from "@/lib/catalog";
import type { ShopCopy } from "@/lib/shop-copy";

export type PriceBadge = "member" | "company" | "channel";

export type ProductPricing =
  | { kind: "withheld"; reason: CmssyPriceWithheldReason }
  | {
      kind: "priced";
      badge: PriceBadge | null;
      displayMode: CmssyPriceDisplayMode;
      taxTreatmentKind: CmssyTaxTreatmentKind;
    };

/** The fields both the per-item and the catalogue price rows carry. */
export interface OverlayPriceRow {
  recordId: string;
  variantKey?: string | null;
  price: number;
  source: CmssyBuyerPrice["source"];
  listSource: CmssyPriceListSource | null;
  displayMode: CmssyPriceDisplayMode;
  taxTreatmentKind: CmssyTaxTreatmentKind;
  priceAmount: CmssyTaxedAmount;
  tiers?: CmssyPriceTier[];
}

export interface PriceOverlay {
  /** Product-level rows by record id; variant rows by `recordId:variantKey`. */
  rows: Map<string, OverlayPriceRow>;
  withheld: CmssyPriceWithheldReason | null;
  nextChangeAt: string | null;
}

export function overlayKey(recordId: string, variantKey?: string | null) {
  return variantKey ? `${recordId}:${variantKey}` : recordId;
}

export function indexRows(rows: readonly OverlayPriceRow[]) {
  return new Map(
    rows.map((row) => [overlayKey(row.recordId, row.variantKey), row]),
  );
}

export function badgeFor(
  listSource: CmssyPriceListSource | null,
): PriceBadge | null {
  if (listSource === "COMPANY") return "company";
  if (listSource === "CHANNEL") return "channel";
  if (listSource === "MEMBER") return "member";
  return null;
}

export function badgeLabel(badge: PriceBadge, copy: ShopCopy): string {
  const labels: Record<PriceBadge, string> = {
    company: copy.priceBadgeCompany,
    channel: copy.priceBadgeChannel,
    member: copy.priceBadgeMember,
  };
  return labels[badge];
}

export function withheldLabel(
  reason: CmssyPriceWithheldReason,
  copy: ShopCopy,
): string {
  return reason === "COMPANY_MEMBERS_ONLY"
    ? copy.signInCompanyToSeePrices
    : copy.signInToSeePrices;
}

// The amount the buyer is shown: net or gross as the channel or the workspace
// displays it, already split by the API for the buyer's tax treatment.
export function displayAmount(row: OverlayPriceRow): number {
  return row.displayMode === "gross"
    ? row.priceAmount.gross
    : row.priceAmount.net;
}

// Volume breaks come in the stored basis; scale them by the same factor the
// API used to split the unit price so the table stays in the display basis.
function scaleTiers(
  tiers: readonly PriceTier[],
  row: OverlayPriceRow,
): PriceTier[] {
  const factor = row.price > 0 ? displayAmount(row) / row.price : 1;
  return tiers
    .map((tier) => ({
      minQty: tier.minQty,
      price: Math.round(tier.price * factor),
    }))
    .sort((a, b) => a.minQty - b.minQty);
}

function tiersFor(row: OverlayPriceRow, catalogTiers: readonly PriceTier[]) {
  if (row.tiers) return scaleTiers(row.tiers, row);
  // A catalogue row carries no tiers: the catalogue's own still apply when no
  // list priced the product, a list's are unknown here so none are shown.
  return row.source === "catalogue" ? scaleTiers(catalogTiers, row) : [];
}

function repriceVariant(
  variant: ProductVariant,
  row: OverlayPriceRow | undefined,
): ProductVariant {
  if (!row) return variant;
  return {
    ...variant,
    price: displayAmount(row),
    tiers: tiersFor(row, variant.tiers),
  };
}

export function repriceProduct(
  product: Product,
  overlay: PriceOverlay | null,
): Product {
  if (!overlay) return product;
  if (overlay.withheld) {
    return {
      ...product,
      pricing: { kind: "withheld", reason: overlay.withheld },
    };
  }
  const row = overlay.rows.get(product.id);
  if (!row) return product;
  const amount = displayAmount(row);
  return {
    ...product,
    price: product.hasVariants ? product.price : amount,
    fromPrice: amount,
    tiers: tiersFor(row, product.tiers),
    variants: product.variants.map((variant) =>
      repriceVariant(
        variant,
        overlay.rows.get(overlayKey(product.id, variant.id)),
      ),
    ),
    pricing: {
      kind: "priced",
      badge: badgeFor(row.listSource),
      displayMode: row.displayMode,
      taxTreatmentKind: row.taxTreatmentKind,
    },
  };
}

export function perUnitLabel(
  pricing: ProductPricing | undefined,
  copy: ShopCopy,
): string {
  return pricing?.kind === "priced" && pricing.displayMode === "gross"
    ? copy.grossPer
    : copy.netPer;
}

// A dated channel list ends or starts at nextChangeAt; the hint belongs only
// on a price the channel's list set.
export function priceChangeDate(
  pricing: ProductPricing | undefined,
  nextChangeAt: string | null,
  locale: string,
): string | null {
  if (!nextChangeAt) return null;
  if (pricing?.kind !== "priced" || pricing.badge !== "channel") return null;
  const date = new Date(nextChangeAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}
