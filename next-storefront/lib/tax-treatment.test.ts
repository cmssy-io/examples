import { describe, expect, it } from "vitest";
import { orderPricingFacts, reverseChargeNote } from "./tax-treatment";
import { copyFor } from "./shop-copy";

const copy = copyFor("en");

describe("reverseChargeNote", () => {
  it("prints the legal note and the buyer's VAT id on a reverse-charge order", () => {
    expect(
      reverseChargeNote(
        {
          kind: "reverse_charge",
          legalNote: "Reverse charge - Art. 196 Directive 2006/112/EC",
          buyerVatId: "DE123456789",
        },
        copy,
      ),
    ).toEqual({
      note: "Reverse charge - Art. 196 Directive 2006/112/EC",
      buyerVatId: "DE123456789",
    });
  });

  it("falls back to the shop's wording when the workspace set none", () => {
    expect(
      reverseChargeNote(
        { kind: "reverse_charge", legalNote: "  ", buyerVatId: null },
        copy,
      ),
    ).toEqual({ note: copy.reverseChargeNote, buyerVatId: null });
  });

  it.each(["standard", "exempt"] as const)("prints nothing for %s", (kind) => {
    expect(
      reverseChargeNote(
        { kind, legalNote: "Exempt under §13", buyerVatId: "DE1" },
        copy,
      ),
    ).toBeNull();
  });

  it("prints nothing without a treatment", () => {
    expect(reverseChargeNote(null, copy)).toBeNull();
    expect(reverseChargeNote(undefined, copy)).toBeNull();
  });
});

describe("orderPricingFacts", () => {
  it("names the channel and whose price list priced the order", () => {
    expect(
      orderPricingFacts(
        {
          channel: { key: "distributor", name: "Distributors & Resellers" },
          priceList: { name: "Gold dealer" },
          priceListSource: "COMPANY",
        },
        copy,
      ),
    ).toEqual([
      { label: copy.salesChannel, value: "Distributors & Resellers" },
      { label: copy.priceList, value: "Gold dealer (your company)" },
    ]);
  });

  it("shows the list name alone when the source is missing", () => {
    expect(
      orderPricingFacts(
        { channel: null, priceList: { name: "Retail" }, priceListSource: null },
        copy,
      ),
    ).toEqual([{ label: copy.priceList, value: "Retail" }]);
  });

  it("labels a channel list and a member's own list", () => {
    expect(
      orderPricingFacts(
        { priceList: { name: "Express" }, priceListSource: "CHANNEL" },
        copy,
      )[0].value,
    ).toBe("Express (the sales channel)");
    expect(
      orderPricingFacts(
        { priceList: { name: "VIP" }, priceListSource: "MEMBER" },
        copy,
      )[0].value,
    ).toBe("VIP (your account)");
  });

  it("shows nothing for an order placed outside channels and lists", () => {
    expect(
      orderPricingFacts(
        { channel: null, priceList: null, priceListSource: null },
        copy,
      ),
    ).toEqual([]);
  });
});
