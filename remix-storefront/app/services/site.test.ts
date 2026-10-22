import { beforeEach, describe, expect, it, vi } from "vitest";

const publicRequest = vi.hoisted(() => vi.fn());

vi.mock("../../cmssy.config", () => ({ cmssy: { workspaceSlug: "shop" } }));
vi.mock("./gateway", () => ({ publicRequest, client: {} }));

async function freshSite() {
  vi.resetModules();
  return import("./site");
}

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
