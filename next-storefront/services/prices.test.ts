import { describe, expect, it, vi } from "vitest";

vi.mock("@/cmssy.config", () => ({
  cmssy: { org: "acme", workspaceSlug: "shop", draftSecret: "x".repeat(16) },
}));
vi.mock("@/lib/cmssy/member-token", () => ({ memberAccessToken: vi.fn() }));
vi.mock("@/services/channel", () => ({ activeChannel: vi.fn() }));

const { settleOverlay } = await import("./prices");
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
