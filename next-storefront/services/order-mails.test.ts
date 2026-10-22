import type { CmssyWebhookEvent } from "@cmssy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderForMail } from "@/lib/order-mail";
import {
  mailOrderEvent,
  shippedWithTracking,
  type OrderMailDeps,
} from "./order-mails";

vi.mock("@/cmssy.config", () => ({ cmssy: {} }));

const taxed = (net: number, tax: number) => ({ net, tax, gross: net + tax });

const ORDER: OrderForMail = {
  id: "o1",
  orderNumber: 42,
  customerEmail: "buyer@example.com",
  currency: "EUR",
  items: [
    {
      name: "Oak desk",
      sku: "DESK-1",
      quantity: 1,
      taxRate: 0,
      line: taxed(24900, 0),
    },
  ],
  amounts: {
    subtotal: taxed(24900, 0),
    discount: taxed(0, 0),
    shipping: taxed(0, 0),
    total: taxed(24900, 0),
  },
  taxTreatment: {
    kind: "reverse_charge",
    legalNote: "Reverse charge.",
    buyerVatId: "DE123456789",
  },
};

const SHIPMENT = {
  id: "s1",
  carrier: "USPS",
  trackingNumber: "9400",
  trackingUrl: "https://track.example/9400",
  labelUrl: null,
  status: "label_purchased" as const,
  items: [],
  shippedAt: null,
  deliveredAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

function delivery(
  event: string,
  data: Partial<CmssyWebhookEvent["data"]> = {},
): CmssyWebhookEvent {
  return {
    id: "d1",
    event,
    createdAt: "2026-10-01T00:00:00.000Z",
    data: {
      workspaceId: "w1",
      order: { id: "o1", customerEmail: "buyer@example.com" },
      ...data,
    } as CmssyWebhookEvent["data"],
  };
}

function deps(overrides: Partial<Omit<OrderMailDeps, "send">> = {}) {
  return {
    resend: {
      apiKey: "re_test",
      from: "Shop <shop@shop.example>",
      allowlist: [],
    },
    hasAdminToken: true,
    request: vi.fn().mockResolvedValue({
      data: { order: { get: ORDER } },
      errors: [],
    }),
    ...overrides,
    send: vi.fn().mockResolvedValue("sent"),
  } satisfies OrderMailDeps;
}

describe("mailOrderEvent", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("mails the confirmation of a new order, read back from cmssy", async () => {
    const d = deps();
    expect(await mailOrderEvent(delivery("order.created"), d)).toBe("sent");
    expect(d.request).toHaveBeenCalledWith(
      expect.stringContaining("taxTreatment { kind legalNote buyerVatId }"),
      { id: "o1" },
      expect.any(String),
    );
    const [mail, key, config] = d.send.mock.calls[0];
    expect(mail.subject).toBe("Your order #42 is confirmed");
    expect(mail.text).toContain("Reverse charge. Buyer VAT ID: DE123456789.");
    expect(key).toBe("order.created/d1");
    expect(config).toBe(d.resend);
  });

  it("keys every mail by its delivery id, so a retry is not a second mail", async () => {
    const d = deps();
    await mailOrderEvent(delivery("order.canceled"), d);
    await mailOrderEvent(delivery("order.canceled"), d);
    expect(d.send.mock.calls.map((call) => call[1])).toEqual([
      "order.canceled/d1",
      "order.canceled/d1",
    ]);
    expect(d.send.mock.calls[0][0].subject).toBe("Your order #42 was canceled");
  });

  it("mails the tracking of a parcel created with it", async () => {
    const d = deps();
    const outcome = await mailOrderEvent(
      delivery("shipment.created", {
        shipment: SHIPMENT,
        previousStatus: null,
      }),
      d,
    );
    expect(outcome).toBe("sent");
    expect(d.send.mock.calls[0][0].text).toContain("Tracking number: 9400");
    expect(d.send.mock.calls[0][1]).toBe("shipment.created/d1");
  });

  it("mails the tracking when a pending parcel gets its label", async () => {
    const d = deps();
    const outcome = await mailOrderEvent(
      delivery("shipment.updated", {
        shipment: SHIPMENT,
        previousStatus: "pending",
      }),
      d,
    );
    expect(outcome).toBe("sent");
    expect(d.send.mock.calls[0][0].subject).toBe("Your order #42 has shipped");
  });

  it("skips later parcel updates and parcels without tracking", async () => {
    const d = deps();
    const later = delivery("shipment.updated", {
      shipment: { ...SHIPMENT, status: "in_transit" },
      previousStatus: "label_purchased",
    });
    const claimed = delivery("shipment.created", {
      shipment: { ...SHIPMENT, trackingNumber: null, status: "pending" },
      previousStatus: null,
    });
    expect(await mailOrderEvent(later, d)).toBe("no_mail");
    expect(await mailOrderEvent(claimed, d)).toBe("no_mail");
    expect(d.request).not.toHaveBeenCalled();
    expect(d.send).not.toHaveBeenCalled();
  });

  it("logs and skips order mails when Resend is not configured", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const d = deps({ resend: null, hasAdminToken: false });
    expect(await mailOrderEvent(delivery("order.created"), d)).toBe(
      "not_configured",
    );
    expect(info).toHaveBeenCalledWith(
      "order mail skipped: RESEND_API_KEY or MAIL_FROM is not set",
      { event: "order.created", orderId: "o1" },
    );
    expect(d.request).not.toHaveBeenCalled();
    expect(d.send).not.toHaveBeenCalled();
  });

  it("skips a buyer off the allowlist before reading the order", async () => {
    const d = deps({
      resend: {
        apiKey: "re_test",
        from: "Shop <shop@shop.example>",
        allowlist: ["@shop.example"],
      },
    });
    expect(await mailOrderEvent(delivery("order.created"), d)).toBe(
      "not_allowed",
    );
    expect(d.request).not.toHaveBeenCalled();
    expect(d.send).not.toHaveBeenCalled();
  });

  it("needs the admin token to read the order", async () => {
    const d = deps({ hasAdminToken: false });
    expect(await mailOrderEvent(delivery("order.created"), d)).toBe(
      "no_admin_token",
    );
    expect(d.send).not.toHaveBeenCalled();
  });

  it("sends nothing for an order cmssy no longer has", async () => {
    const d = deps({
      request: vi.fn().mockResolvedValue({
        data: { order: { get: null } },
        errors: [
          { message: "Order not found", extensions: { code: "NOT_FOUND" } },
        ],
      }),
    });
    expect(await mailOrderEvent(delivery("order.created"), d)).toBe(
      "order_not_found",
    );
    expect(d.send).not.toHaveBeenCalled();
  });

  it("fails on any other read error, so cmssy retries", async () => {
    const d = deps({
      request: vi.fn().mockResolvedValue({
        errors: [
          { message: "boom", extensions: { code: "INTERNAL_SERVER_ERROR" } },
        ],
      }),
    });
    await expect(mailOrderEvent(delivery("order.created"), d)).rejects.toThrow(
      "boom",
    );
  });
});

describe("shippedWithTracking", () => {
  it("ignores a canceled parcel", () => {
    expect(
      shippedWithTracking(
        delivery("shipment.updated", {
          shipment: { ...SHIPMENT, status: "canceled" },
          previousStatus: "pending",
        }),
      ),
    ).toBeNull();
  });
});
