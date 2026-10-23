import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "s".repeat(32);
const queryScoped = vi.fn();
const draft = { isEnabled: false };

vi.mock("next/headers", () => ({ draftMode: async () => draft }));
vi.mock("@/cmssy.config", () => ({
  cmssy: { org: "acme", workspaceSlug: "shop", draftSecret: SECRET },
}));
vi.mock("@cmssy/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@cmssy/core")>()),
  createCmssyClient: () => ({ queryScoped }),
}));
vi.mock("@/services/site", () => ({
  fetchShopSettings: async () => ({ tax: null, lowStockThreshold: null }),
  fetchProductRoles: async () => null,
}));

const { loadProductBySlug, loadProducts } = await import("./catalog");

type Vars = {
  modelSlug: string;
  filter?: { slug?: string };
  previewSecret?: string | null;
};

const BRAND = { id: "b-draft", data: { name: "Draftco", slug: "draftco" } };
const PUBLISHED = { id: "p-live", data: { title: "Live", slug: "live" } };
const DRAFT = {
  id: "p-draft",
  data: { title: "Valve 52", slug: "valve-52-g14", brand: "b-draft" },
};

function product(row: { id: string; data: Record<string, unknown> }) {
  return {
    ...row,
    data: { price: 10, ...row.data },
    variantCount: 0,
    variantPriceRange: null,
    available: 5,
    variants: [],
  };
}

function page<T>(items: T[]) {
  return {
    public: {
      model: { records: { items, total: items.length, hasMore: false } },
    },
  };
}

function calls(modelSlug: string): Vars[] {
  return queryScoped.mock.calls
    .map(([, vars]) => vars as Vars)
    .filter((vars) => vars.modelSlug === modelSlug);
}

beforeEach(() => {
  draft.isEnabled = false;
  queryScoped.mockReset();
  queryScoped.mockImplementation(async (_doc, vars: Vars) => {
    const preview = vars.previewSecret === SECRET;
    if (vars.modelSlug === "brand") return page(preview ? [BRAND] : []);
    const slug = vars.filter?.slug;
    const rows = preview ? [PUBLISHED, DRAFT] : [PUBLISHED];
    return page(
      rows.filter((row) => !slug || row.data.slug === slug).map(product),
    );
  });
});

describe("a draft product in Next draft mode", () => {
  it("reads the product and its brand with the draft secret", async () => {
    draft.isEnabled = true;

    const found = await loadProductBySlug("valve-52-g14", "en");

    expect(found?.id).toBe("p-draft");
    expect(found?.brand).toEqual({
      id: "b-draft",
      name: "Draftco",
      slug: "draftco",
    });
    expect(calls("product").map((vars) => vars.previewSecret)).toEqual([
      SECRET,
    ]);
    expect(calls("brand").map((vars) => vars.previewSecret)).toEqual([SECRET]);
  });

  it("never sends the secret outside draft mode", async () => {
    await loadProductBySlug("valve-52-g14", "de");

    expect(queryScoped).toHaveBeenCalled();
    for (const [, vars] of queryScoped.mock.calls) {
      expect((vars as Vars).previewSecret ?? null).toBeNull();
    }
  });

  it("lists drafts past the shared cache and leaves nothing in it for visitors", async () => {
    draft.isEnabled = true;
    const first = await loadProducts({ locale: "pl" });
    await loadProducts({ locale: "pl" });

    expect(first.items.map((item) => item.id)).toEqual(["p-live", "p-draft"]);
    expect(calls("product").map((vars) => vars.previewSecret)).toEqual([
      SECRET,
      SECRET,
    ]);

    draft.isEnabled = false;
    const visitor = await loadProducts({ locale: "pl" });
    await loadProducts({ locale: "pl" });

    expect(visitor.items.map((item) => item.id)).toEqual(["p-live"]);
    expect(calls("product").map((vars) => vars.previewSecret)).toEqual([
      SECRET,
      SECRET,
      null,
    ]);
  });
});
