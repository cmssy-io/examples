import { describe, expect, it, vi } from "vitest";

vi.mock("@/cmssy.config", () => ({
  cmssy: { org: "acme", workspaceSlug: "shop", draftSecret: "x".repeat(16) },
}));

const { pageProducts } = await import("./catalog");
const { repriceProduct, soldOnChannel, indexRows } =
  await import("./price-overlay");
type Product = import("./catalog").Product;
type OverlayPriceRow = import("./price-overlay").OverlayPriceRow;

function product(id: string, title: string): Product {
  return {
    id,
    title,
    slug: id,
    sku: id,
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
    tiers: [],
    image: null,
    gallery: [],
    documents: [],
    video: null,
    fromPrice: 1000,
    hasVariants: false,
    variantCount: 0,
    variants: [],
  };
}

function eurRow(recordId: string): OverlayPriceRow {
  return {
    recordId,
    currency: "EUR",
    price: 90,
    source: "catalogue",
    listSource: null,
    displayMode: "gross",
    taxTreatmentKind: "standard",
    priceAmount: { net: 72, tax: 18, gross: 90 },
  };
}

describe("a listing on a channel in another currency (CMS-2143)", () => {
  const catalogue = ["a", "b", "c", "d", "e"].map((id) => product(id, id));
  const overlay = {
    rows: indexRows(["a", "c", "e"].map(eurRow)),
    withheld: null,
    nextChangeAt: null,
    channelCurrency: "EUR",
  };
  const sold = catalogue
    .filter((item) => soldOnChannel(item, overlay))
    .map((item) => repriceProduct(item, overlay));

  it("counts and pages only the products the channel sells", () => {
    const first = pageProducts(sold, { page: 1, limit: 2 });
    const second = pageProducts(sold, { page: 2, limit: 2 });

    expect(first.total).toBe(3);
    expect(first.items.map((item) => item.id)).toEqual(["a", "c"]);
    expect(first.hasMore).toBe(true);
    expect(second.items.map((item) => item.id)).toEqual(["e"]);
    expect(second.hasMore).toBe(false);
  });

  it("shows only the channel's price, in its currency", () => {
    const page = pageProducts(sold, { page: 1, limit: 10 });

    expect(page.items.every((item) => item.fromPrice === 90)).toBe(true);
    expect(page.items.map((item) => item.pricing)).toEqual(
      page.items.map(() => expect.objectContaining({ currency: "EUR" })),
    );
  });

  it("lists nothing when the channel's prices could not be read", () => {
    const failed = { ...overlay, rows: indexRows([]) };

    expect(catalogue.filter((item) => soldOnChannel(item, failed))).toEqual([]);
  });
});
