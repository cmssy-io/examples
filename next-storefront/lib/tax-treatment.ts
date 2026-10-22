import type { CmssyPriceListSource, CmssyTaxTreatmentKind } from "@cmssy/core";
import type { ShopCopy } from "@/lib/shop-copy";

export interface TaxTreatmentView {
  kind: CmssyTaxTreatmentKind;
  legalNote?: string | null;
  buyerVatId?: string | null;
}

export interface ReverseChargeNote {
  note: string;
  buyerVatId: string | null;
}

// cmssy decides the treatment and stores the merchant's invoice wording in
// legalNote; the storefront only prints it next to the buyer's VAT id.
export function reverseChargeNote(
  treatment: TaxTreatmentView | null | undefined,
  copy: ShopCopy,
): ReverseChargeNote | null {
  if (treatment?.kind !== "reverse_charge") return null;
  return {
    note: treatment.legalNote?.trim() || copy.reverseChargeNote,
    buyerVatId: treatment.buyerVatId?.trim() || null,
  };
}

export interface OrderPricingView {
  channel?: { key: string; name: string } | null;
  priceList?: { name: string } | null;
  priceListSource?: CmssyPriceListSource | null;
}

export interface OrderFact {
  label: string;
  value: string;
}

function sourceLabel(
  source: OrderPricingView["priceListSource"],
  copy: ShopCopy,
): string | null {
  if (source === "MEMBER") return copy.priceListFromMember;
  if (source === "COMPANY") return copy.priceListFromCompany;
  if (source === "CHANNEL") return copy.priceListFromChannel;
  return null;
}

export function orderPricingFacts(
  order: OrderPricingView,
  copy: ShopCopy,
): OrderFact[] {
  const facts: OrderFact[] = [];
  if (order.channel) {
    facts.push({ label: copy.salesChannel, value: order.channel.name });
  }
  if (order.priceList) {
    const source = sourceLabel(order.priceListSource, copy);
    facts.push({
      label: copy.priceList,
      value: source
        ? `${order.priceList.name} (${source})`
        : order.priceList.name,
    });
  }
  return facts;
}
