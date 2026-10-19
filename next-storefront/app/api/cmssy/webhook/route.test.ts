import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyCmssyWebhook = vi.fn();
const refundOnStripe = vi.fn();
const shipOrder = vi.fn();

vi.mock("@cmssy/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@cmssy/core")>()),
  verifyCmssyWebhook,
}));
vi.mock("@/cmssy.config", () => ({ cmssy: {} }));
vi.mock("@/services/refunds", () => ({ refundOnStripe }));
vi.mock("@/services/shipments", () => ({ shipOrder }));

const { POST } = await import("./route");

const RETURN = {
  id: "r1",
  number: 1,
  status: "completed",
  origin: "buyer",
  lines: [],
  note: null,
  carrier: null,
  trackingNumber: null,
  refundedAmount: 5000,
  requestedAt: "2026-10-01T00:00:00.000Z",
  receivedAt: null,
  completedAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

function deliver(event: string, data: object) {
  verifyCmssyWebhook.mockResolvedValueOnce({
    id: "d1",
    event,
    createdAt: "2026-10-01T00:00:00.000Z",
    data: { workspaceId: "w1", order: { id: "o1" }, ...data },
  });
  return POST(
    new Request("https://shop.example/api/cmssy/webhook", {
      method: "POST",
      body: "{}",
      headers: { "x-cmssy-signature": "t=1,v1=x" },
    }),
  );
}

describe("POST /api/cmssy/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("CMSSY_WEBHOOK_SECRET", "whsec");
    vi.stubEnv("CMSSY_API_TOKEN", "cs_test");
    refundOnStripe.mockReset();
    shipOrder.mockReset();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("acknowledges a return event without moving money or booking a parcel", async () => {
    const response = await deliver("return.refunded", { return: RETURN });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      received: true,
      handled: true,
      returnId: "r1",
      status: "completed",
    });
    expect(refundOnStripe).not.toHaveBeenCalled();
    expect(shipOrder).not.toHaveBeenCalled();
  });

  it("leaves the Stripe refund of a return to the order refund event", async () => {
    refundOnStripe.mockResolvedValueOnce({ refunded: 5000 });
    const response = await deliver("order.partially_refunded", {});
    expect(await response.json()).toMatchObject({ handled: true, refunded: 5000 });
    expect(refundOnStripe).toHaveBeenCalledWith("o1");
  });

  it("ignores a return event that carries no return", async () => {
    const response = await deliver("return.requested", {});
    expect(await response.json()).toEqual({ received: true, handled: false });
  });
});
