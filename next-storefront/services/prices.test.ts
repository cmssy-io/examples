import { describe, expect, it, vi } from "vitest";

vi.mock("@/cmssy.config", () => ({
  cmssy: { org: "acme", workspaceSlug: "shop", draftSecret: "x".repeat(16) },
}));
vi.mock("@/lib/cmssy/member-token", () => ({ memberAccessToken: vi.fn() }));
vi.mock("@/services/channel", () => ({ activeChannel: vi.fn() }));
vi.mock("@/lib/cmssy/preview-secret", () => ({ previewSecret: vi.fn() }));
vi.mock("@cmssy/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@cmssy/core")>()),
  createCmssyClient: () => ({ resolveWorkspaceId: async () => "w1" }),
  getBuyerPrices: vi.fn(async () => []),
  getBuyerCatalogPrices: vi.fn(async () => ({ items: [], total: 0 })),
}));

const { getBuyerCatalogPrices, getBuyerPrices } = await import("@cmssy/core");
const { memberAccessToken } = await import("@/lib/cmssy/member-token");
const { activeChannel } = await import("@/services/channel");
const { previewSecret } = await import("@/lib/cmssy/preview-secret");
const { loadCatalogOverlay, loadPriceOverlay, settleOverlay } =
  await import("./prices");
type Viewer = import("./prices").Viewer;

const viewer = (channelCurrency: string | null): Viewer => ({
  workspaceId: "w1",
  accessToken: undefined,
  channel: "eu-export",
  channelCurrency,
  nextChangeAt: null,
});

const failing = async () => {
  throw new Error("network down");
};

describe("a failed price read (CMS-2143)", () => {
  it("keeps the catalogue price on a channel in the default currency", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await settleOverlay(viewer(null), failing)).toBeNull();
  });

  it("prices nothing on a channel in another currency, never the catalogue's", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const overlay = await settleOverlay(viewer("EUR"), failing);

    expect(overlay).toEqual({
      rows: new Map(),
      withheld: null,
      nextChangeAt: null,
      channelCurrency: "EUR",
    });
  });
});

describe("a signed-in member's prices in draft mode", () => {
  const signedIn = (secret: string | undefined) => {
    vi.mocked(memberAccessToken).mockResolvedValue("member-token");
    vi.mocked(activeChannel).mockResolvedValue({
      channel: null,
      gone: false,
      probe: null,
    });
    vi.mocked(previewSecret).mockResolvedValue(secret);
    vi.mocked(getBuyerPrices).mockClear();
    vi.mocked(getBuyerCatalogPrices).mockClear();
  };
  const sentSecret = (mock: { mock: { calls: unknown[][] } }) =>
    (mock.mock.calls[0]?.[2] as { previewSecret?: string }).previewSecret;

  it("sends the draft secret with the member's product prices", async () => {
    signedIn("draft-secret");
    await loadPriceOverlay([{ recordId: "p1" }]);
    expect(sentSecret(vi.mocked(getBuyerPrices))).toBe("draft-secret");
  });

  it("sends the draft secret with the member's catalogue prices", async () => {
    signedIn("draft-secret");
    await loadCatalogOverlay({});
    expect(sentSecret(vi.mocked(getBuyerCatalogPrices))).toBe("draft-secret");
  });

  it("sends no secret outside draft mode", async () => {
    signedIn(undefined);
    await loadPriceOverlay([{ recordId: "p1" }]);
    await loadCatalogOverlay({});
    expect(sentSecret(vi.mocked(getBuyerPrices))).toBeUndefined();
    expect(sentSecret(vi.mocked(getBuyerCatalogPrices))).toBeUndefined();
  });
});
