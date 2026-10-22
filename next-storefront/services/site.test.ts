import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const publicRequest = vi.fn();

vi.mock("@/cmssy.config", () => ({ cmssy: { workspaceSlug: "shop" } }));
vi.mock("@/services/gateway", () => ({
  publicRequest,
  scopedRequest: vi.fn(),
}));

async function freshSite() {
  vi.resetModules();
  return import("./site");
}

describe("fetchBrand", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://parts.example");
    vi.stubEnv("MAIL_FROM", "Mail Sender <shop@parts.example>");
    publicRequest.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("takes the brand from the site config in cmssy", async () => {
    publicRequest.mockResolvedValueOnce({
      public: {
        siteConfig: {
          siteName: { en: "Northwind" },
          defaultLanguage: "en",
          enabledLanguages: ["en"],
          notFoundPageId: null,
          branding: {
            brandName: "Northwind Parts",
            logoUrl: "https://cdn.example/logo.png",
            logoDarkUrl: null,
            faviconUrl: null,
            ogImageUrl: null,
          },
        },
      },
    });
    const { fetchBrand } = await freshSite();
    expect(await fetchBrand()).toEqual({
      name: "Northwind Parts",
      logoUrl: "https://cdn.example/logo.png",
      siteUrl: "https://parts.example",
    });
  });

  it("still signs the mail with the sender's name when cmssy cannot be read", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    publicRequest.mockRejectedValueOnce(new Error("offline"));
    const { fetchBrand } = await freshSite();
    expect(await fetchBrand()).toEqual({
      name: "Mail Sender",
      logoUrl: null,
      siteUrl: "https://parts.example",
    });
  });
});

describe("fetchShopSettings", () => {
  beforeEach(() => publicRequest.mockReset());

  it("prices the catalogue in the cart's default currency from cmssy", async () => {
    publicRequest.mockResolvedValueOnce({
      public: {
        siteConfig: {
          id: "s1",
          lowStockThreshold: 5,
          publicCart: {
            defaultCurrency: "NOK",
            defaultTaxRateId: "mva25",
            taxRates: [{ id: "mva25", rate: 25 }],
            shippingMethods: [],
            orderFields: [],
          },
        },
      },
    });
    const { fetchShopSettings } = await freshSite();
    expect((await fetchShopSettings()).currency).toBe("NOK");
  });

  it("knows no currency when the workspace has no cart", async () => {
    publicRequest.mockResolvedValueOnce({
      public: {
        siteConfig: { id: "s1", lowStockThreshold: 5, publicCart: null },
      },
    });
    const { fetchShopSettings } = await freshSite();
    expect((await fetchShopSettings()).currency).toBeNull();
  });
});
