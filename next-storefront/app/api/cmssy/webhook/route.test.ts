import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyCmssyWebhook = vi.fn();
const refundOnStripe = vi.fn();
const shipOrder = vi.fn();
const sendAccountMail = vi.fn();
const mailOrderEvent = vi.fn();

vi.mock("@cmssy/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@cmssy/core")>()),
  verifyCmssyWebhook,
}));
vi.mock("@/cmssy.config", () => ({ cmssy: {} }));
vi.mock("@/services/refunds", () => ({ refundOnStripe }));
vi.mock("@/services/shipments", () => ({ shipOrder }));
vi.mock("@/services/order-mails", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/order-mails")>()),
  mailOrderEvent,
}));
vi.mock("@/lib/account-mail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/account-mail")>()),
  accountMailSender: () => ({ send: sendAccountMail }),
}));

const { POST } = await import("./route");
const { CmssyWebhookError } = await import("@cmssy/core");

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
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example");
    refundOnStripe.mockReset();
    shipOrder.mockReset();
    sendAccountMail.mockReset();
    mailOrderEvent.mockReset();
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

  describe.each([
    [
      "account.verification_requested",
      "https://shop.example/verify-email?token=tok-1",
      "buyer@shop.example",
    ],
    [
      "account.password_reset_requested",
      "https://shop.example/reset-password?token=tok-1",
      "buyer@shop.example",
    ],
    [
      "account.login_change_requested",
      "https://shop.example/confirm-login-change?token=tok-1",
      "new@shop.example",
    ],
  ])("%s", (event, link, to) => {
    const request = {
      workspaceId: "w1",
      modelSlug: "shopmember",
      recordId: "m1",
      login: to,
      ...(event === "account.login_change_requested"
        ? { previousLogin: "buyer@shop.example" }
        : {}),
      token: "tok-1",
      expiresAt: "2026-10-02T00:00:00.000Z",
    };

    it("hands the member's link to the mail sender", async () => {
      sendAccountMail.mockResolvedValueOnce(undefined);
      const response = await deliver(event, request);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true, handled: true });
      expect(sendAccountMail).toHaveBeenCalledTimes(1);
      expect(sendAccountMail.mock.calls[0][0]).toMatchObject({
        to,
        link,
        event,
      });
      expect(sendAccountMail.mock.calls[0][0].text).toContain(link);
      expect(sendAccountMail.mock.calls[0][1]).toBe(`${event}/d1`);
      expect(refundOnStripe).not.toHaveBeenCalled();
      expect(shipOrder).not.toHaveBeenCalled();
    });

    it("works without the admin token", async () => {
      vi.stubEnv("CMSSY_API_TOKEN", "");
      sendAccountMail.mockResolvedValueOnce(undefined);
      const response = await deliver(event, request);
      expect(response.status).toBe(200);
      expect(sendAccountMail).toHaveBeenCalledTimes(1);
    });

    it("answers 500 when the mail is not sent, so cmssy retries", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      sendAccountMail.mockRejectedValueOnce(new Error("smtp down"));
      const response = await deliver(event, request);
      expect(response.status).toBe(500);
    });
  });

  it("refuses an account event with a bad signature", async () => {
    verifyCmssyWebhook.mockRejectedValueOnce(
      new CmssyWebhookError("bad signature"),
    );
    const response = await POST(
      new Request("https://shop.example/api/cmssy/webhook", {
        method: "POST",
        body: "{}",
        headers: { "x-cmssy-signature": "t=1,v1=forged" },
      }),
    );
    expect(response.status).toBe(401);
    expect(sendAccountMail).not.toHaveBeenCalled();
  });

  it("still needs the admin token to book a parcel", async () => {
    vi.stubEnv("CMSSY_API_TOKEN", "");
    const response = await deliver("order.paid", {});
    expect(response.status).toBe(503);
    expect(shipOrder).not.toHaveBeenCalled();
  });

  describe.each([
    ["order.created", {}],
    ["order.canceled", {}],
    ["shipment.created", { shipment: { id: "s1", trackingNumber: "9400" } }],
    ["shipment.updated", { shipment: { id: "s1", trackingNumber: "9400" } }],
  ])("%s", (event, data) => {
    it("hands the delivery to the order mailer and nothing else", async () => {
      mailOrderEvent.mockResolvedValueOnce("sent");
      const response = await deliver(event, data);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        received: true,
        handled: true,
        mail: "sent",
      });
      expect(mailOrderEvent).toHaveBeenCalledTimes(1);
      expect(mailOrderEvent.mock.calls[0][0]).toMatchObject({ id: "d1", event });
      expect(shipOrder).not.toHaveBeenCalled();
      expect(refundOnStripe).not.toHaveBeenCalled();
    });

    it("answers 500 when the mail is not sent, so cmssy retries", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mailOrderEvent.mockRejectedValueOnce(new Error("resend down"));
      const response = await deliver(event, data);
      expect(response.status).toBe(500);
    });
  });

  it("acknowledges an order mail Resend already sent for this delivery", async () => {
    mailOrderEvent.mockResolvedValueOnce("duplicate");
    const response = await deliver("order.created", {});
    expect(await response.json()).toEqual({
      received: true,
      handled: true,
      mail: "duplicate",
    });
  });

  it("acknowledges without sending when Resend is not configured", async () => {
    mailOrderEvent.mockResolvedValueOnce("not_configured");
    const response = await deliver("order.created", {});
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      received: true,
      handled: false,
      mail: "not_configured",
    });
  });

  it("answers 503 when an order mail needs the admin token it lacks", async () => {
    mailOrderEvent.mockResolvedValueOnce("no_admin_token");
    const response = await deliver("order.created", {});
    expect(response.status).toBe(503);
  });

  it("does not take a label request for an order mail", async () => {
    shipOrder.mockResolvedValueOnce({ skipped: "no carrier" });
    await deliver("shipment.label_requested", { shipment: { id: "s1" } });
    expect(mailOrderEvent).not.toHaveBeenCalled();
    expect(shipOrder).toHaveBeenCalledTimes(1);
  });
});
