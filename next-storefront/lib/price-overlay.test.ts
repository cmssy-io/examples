import { describe, expect, it } from "vitest";
import type { Product } from "./catalog";
import {
  badgeFor,
  indexRows,
  perUnitLabel,
  priceChangeDate,
  repriceProduct,
  withheldLabel,
  type OverlayPriceRow,
  type PriceOverlay,
} from "./price-overlay";
import { copyFor } from "./shop-copy";

const copy = copyFor("en");

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    title: "Bearing",
    slug: "bearing",
    sku: "B-1",
    brand: null,
    categoryId: null,
    description: null,
    price: 1000,
    taxRate: 25,
    unit: null,
    packaging: null,
    available: 5,
    lowStockThreshold: null,
    specs: null,
    datasheetUrl: null,
    tiers: [{ minQty: 10, price: 900 }],
    image: null,
    gallery: [],
    documents: [],
    video: null,
    fromPrice: 1000,
    hasVariants: false,
    variantCount: 0,
    variants: [],
    ...overrides,
  };
}

function row(overrides: Partial<OverlayPriceRow> = {}): OverlayPriceRow {
  return {
    recordId: "p1",
    variantKey: null,
    price: 800,
    source: "price_list_entry",
    listSource: "COMPANY",
    displayMode: "net",
    taxTreatmentKind: "standard",
    priceAmount: { net: 800, tax: 200, gross: 1000 },
    tiers: [{ minQty: 20, price: 700 }],
    ...overrides,
  };
}

function overlay(rows: OverlayPriceRow[], extra: Partial<PriceOverlay> = {}) {
  return {
    rows: indexRows(rows),
    withheld: null,
    nextChangeAt: null,
    ...extra,
  };
}

describe("badgeFor", () => {
  it("names whose list priced the row", () => {
    expect(badgeFor("COMPANY")).toBe("company");
    expect(badgeFor("CHANNEL")).toBe("channel");
    expect(badgeFor("MEMBER")).toBe("member");
    expect(badgeFor(null)).toBeNull();
  });
});

describe("repriceProduct", () => {
  it("leaves the catalogue product alone without an overlay", () => {
    const base = product();
    expect(repriceProduct(base, null)).toBe(base);
  });

  it("leaves a product the overlay did not price alone", () => {
    const base = product();
    expect(repriceProduct(base, overlay([row({ recordId: "other" })]))).toBe(
      base,
    );
  });

  it("shows the net amount and the list's own tiers with a company badge", () => {
    const priced = repriceProduct(product(), overlay([row()]));
    expect(priced.price).toBe(800);
    expect(priced.fromPrice).toBe(800);
    expect(priced.tiers).toEqual([{ minQty: 20, price: 700 }]);
    expect(priced.pricing).toEqual({
      kind: "priced",
      badge: "company",
      displayMode: "net",
      taxTreatmentKind: "standard",
    });
  });

  it("shows the gross amount and scales the tiers on a gross channel", () => {
    const priced = repriceProduct(
      product(),
      overlay([row({ displayMode: "gross", listSource: "CHANNEL" })]),
    );
    expect(priced.fromPrice).toBe(1000);
    expect(priced.tiers).toEqual([{ minQty: 20, price: 875 }]);
    expect(priced.pricing).toMatchObject({
      badge: "channel",
      displayMode: "gross",
    });
  });

  it("keeps the catalogue tiers for an unlisted catalogue row", () => {
    const priced = repriceProduct(
      product(),
      overlay([
        row({
          source: "catalogue",
          listSource: null,
          price: 1000,
          priceAmount: { net: 1000, tax: 250, gross: 1250 },
          tiers: undefined,
        }),
      ]),
    );
    expect(priced.tiers).toEqual([{ minQty: 10, price: 900 }]);
    expect(priced.pricing).toMatchObject({ badge: null });
  });

  it("drops the catalogue tiers when a list priced a catalogue-page row", () => {
    const priced = repriceProduct(
      product(),
      overlay([row({ tiers: undefined })]),
    );
    expect(priced.tiers).toEqual([]);
  });

  it("reprices each variant from its own row", () => {
    const variant = {
      id: "v1",
      sku: "B-1-L",
      price: 1200,
      inventory: 3,
      selectedOptions: [{ name: "Size", value: "L" }],
      tiers: [],
    };
    const priced = repriceProduct(
      product({ hasVariants: true, variantCount: 1, variants: [variant] }),
      overlay([
        row({ tiers: [] }),
        row({
          variantKey: "v1",
          price: 1100,
          priceAmount: { net: 1100, tax: 275, gross: 1375 },
          tiers: [],
        }),
      ]),
    );
    expect(priced.price).toBe(1000);
    expect(priced.fromPrice).toBe(800);
    expect(priced.variants[0].price).toBe(1100);
  });

  it("marks every product withheld when the channel withholds prices", () => {
    const priced = repriceProduct(
      product(),
      overlay([], { withheld: "MEMBERS_ONLY" }),
    );
    expect(priced.pricing).toEqual({
      kind: "withheld",
      reason: "MEMBERS_ONLY",
    });
    expect(priced.price).toBe(1000);
  });
});

describe("labels", () => {
  it("labels a gross price incl. VAT and anything else net", () => {
    const gross = repriceProduct(
      product(),
      overlay([row({ displayMode: "gross" })]),
    );
    expect(perUnitLabel(gross.pricing, copy)).toBe(copy.grossPer);
    expect(perUnitLabel(undefined, copy)).toBe(copy.netPer);
  });

  it("asks for a company account when the channel sells to companies", () => {
    expect(withheldLabel("COMPANY_MEMBERS_ONLY", copy)).toBe(
      copy.signInCompanyToSeePrices,
    );
    expect(withheldLabel("MEMBERS_ONLY", copy)).toBe(copy.signInToSeePrices);
  });
});

describe("priceChangeDate", () => {
  const channelPriced = repriceProduct(
    product(),
    overlay([row({ listSource: "CHANNEL" })]),
  ).pricing;

  it("formats the change date for a channel-list price", () => {
    expect(
      priceChangeDate(channelPriced, "2026-11-01T12:00:00.000Z", "en"),
    ).toBe("Nov 1, 2026");
  });

  it("shows no date on a price another list set", () => {
    const companyPriced = repriceProduct(product(), overlay([row()])).pricing;
    expect(
      priceChangeDate(companyPriced, "2026-11-01T12:00:00.000Z", "en"),
    ).toBeNull();
  });

  it("shows no date without a change or with a bad one", () => {
    expect(priceChangeDate(channelPriced, null, "en")).toBeNull();
    expect(priceChangeDate(channelPriced, "not a date", "en")).toBeNull();
  });
});
