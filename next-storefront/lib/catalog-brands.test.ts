import { beforeEach, describe, expect, it, vi } from "vitest";

const queryScoped = vi.fn();

vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: false }),
}));
vi.mock("@/cmssy.config", () => ({
  cmssy: { org: "acme", workspaceSlug: "shop", draftSecret: "x".repeat(16) },
}));
vi.mock("@cmssy/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@cmssy/core")>()),
  createCmssyClient: () => ({ queryScoped }),
}));
vi.mock("@/services/site", () => ({
  fetchShopSettings: async () => ({ tax: null, lowStockThreshold: null }),
  fetchProductRoles: async () => null,
}));

const { loadBrandFacets, loadProducts, productFilter } =
  await import("./catalog");

const BRANDS = [
  { id: "b-skf", data: { name: "SKF", slug: "skf" } },
  { id: "b-festo", data: { name: "Festo", slug: "festo" } },
];

const PRODUCTS = [
  { id: "p1", data: { title: "Ball bearing", sku: "B1", brand: "b-skf" } },
  { id: "p2", data: { title: "Roller bearing", sku: "B2", brand: "b-skf" } },
  { id: "p3", data: { title: "Cylinder", sku: "C1", brand: "b-festo" } },
  { id: "p4", data: { title: "Hose", sku: "H1" } },
].map((row) => ({
  ...row,
  data: { price: 10, ...row.data },
  variantCount: 0,
  variantPriceRange: null,
  available: 5,
}));

function page<T>(items: T[]) {
  return {
    public: {
      model: { records: { items, total: items.length, hasMore: false } },
    },
  };
}

beforeEach(() => {
  queryScoped.mockReset();
  queryScoped.mockImplementation(
    async (
      _doc,
      vars: { modelSlug: string; filter?: Record<string, unknown> },
    ) => {
      if (vars.modelSlug === "brand") return page(BRANDS);
      const brand = vars.filter?.brand;
      return page(
        brand ? PRODUCTS.filter((row) => row.data.brand === brand) : PRODUCTS,
      );
    },
  );
});

describe("brand as a related record", () => {
  it("filters the catalog on the brand record id, not its name", () => {
    expect(productFilter({ brandId: "b-skf" })).toEqual({ brand: "b-skf" });
  });

  it("resolves a product's brand id to the brand record's name and slug", async () => {
    const { items } = await loadProducts({ brandId: "b-festo", locale: "en" });
    expect(
      items.map((item) => item.brand),
      "The product stores the brand record id; the card and the detail page need its name and slug",
    ).toEqual([{ id: "b-festo", name: "Festo", slug: "festo" }]);
  });

  it("counts facets per brand record, sorted by name, skipping products without one", async () => {
    const facets = await loadBrandFacets(undefined, "de");
    expect(facets).toEqual([
      { brand: { id: "b-festo", name: "Festo", slug: "festo" }, count: 1 },
      { brand: { id: "b-skf", name: "SKF", slug: "skf" }, count: 2 },
    ]);
  });

  it("finds a product by its brand's name in a search", async () => {
    const { items } = await loadProducts({ search: "festo", locale: "pl" });
    expect(items.map((item) => item.id)).toEqual(["p3"]);
  });
});
