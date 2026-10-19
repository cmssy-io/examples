import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const applyShippoEvent = vi.fn();

vi.mock("@/cmssy.config", () => ({ cmssy: {} }));
vi.mock("@/services/shipments", () => ({ applyShippoEvent }));

const { POST } = await import("./route");

const TRACK = {
  event: "track_updated",
  data: {
    metadata: "shippo:o1:USPS",
    tracking_number: "9334620845500002019083",
    tracking_status: { status: "DELIVERED", status_details: "Delivered" },
  },
};

function post(body: unknown, token: string | null = "s3cret") {
  const url = new URL("https://shop.example/api/shippo/webhook");
  if (token !== null) url.searchParams.set("token", token);
  return POST(
    new Request(url, {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/shippo/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("SHIPPO_WEBHOOK_TOKEN", "s3cret");
    vi.stubEnv("CMSSY_API_TOKEN", "cs_test");
    applyShippoEvent.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("applies a tracking update sent with the token", async () => {
    applyShippoEvent.mockResolvedValue({ applied: "delivered" });

    const res = await post(TRACK);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      received: true,
      handled: true,
      applied: "delivered",
    });
    expect(applyShippoEvent).toHaveBeenCalledWith({
      kind: "tracking",
      key: "shippo:o1:USPS",
      trackingNumber: "9334620845500002019083",
      status: "delivered",
      details: "Delivered",
    });
  });

  it.each([
    ["no token", null],
    ["a wrong token", "guess"],
    ["a token of another length", "s3cret-longer"],
  ])("refuses a request with %s", async (_, token) => {
    const res = await post(TRACK, token);

    expect(res.status).toBe(401);
    expect(applyShippoEvent).not.toHaveBeenCalled();
  });

  it("answers 503 while the token is not configured", async () => {
    vi.stubEnv("SHIPPO_WEBHOOK_TOKEN", "");

    const res = await post(TRACK);

    expect(res.status).toBe(503);
    expect(applyShippoEvent).not.toHaveBeenCalled();
  });

  it("acknowledges an event it does not handle", async () => {
    const res = await post({ event: "batch_created", data: {} });

    expect(await res.json()).toEqual({ received: true, handled: false });
    expect(applyShippoEvent).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    expect((await post("{")).status).toBe(400);
  });

  it("answers 500 so Shippo sends the update again when cmssy fails", async () => {
    applyShippoEvent.mockRejectedValue(new Error("cmssy down"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect((await post(TRACK)).status).toBe(500);
    error.mockRestore();
  });
});
