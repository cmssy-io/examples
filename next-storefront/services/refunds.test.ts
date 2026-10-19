import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminResult } from "./admin";
import {
  recordStripeRefund,
  refundOnStripe,
  type RefundDeps,
  type StripeRefundEvent,
} from "./refunds";

vi.mock("@/cmssy.config", () => ({ cmssy: {} }));

interface FakeRefund {
  amount: number;
  status: string;
  metadata?: Record<string, string>;
}

interface FakeIntent {
  currency?: string;
  amount_received?: number;
  metadata?: Record<string, string>;
}

function fakeStripe(
  refundsByIntent: Record<string, FakeRefund[]> = {},
  intents: Record<string, FakeIntent> = {},
  pageSize = 100,
) {
  return {
    paymentIntents: {
      retrieve: vi.fn(async (id: string) => ({
        currency: "eur",
        amount_received: 5000,
        metadata: { cmssyOrderId: "o1" },
        ...intents[id],
      })),
    },
    refunds: {
      list: vi.fn(
        async ({
          payment_intent,
          starting_after,
        }: {
          payment_intent: string;
          starting_after?: string;
        }) => {
          const all = (refundsByIntent[payment_intent] ?? []).map((r, i) => ({
            id: `re_${i}`,
            ...r,
          }));
          const from = starting_after
            ? all.findIndex((r) => r.id === starting_after) + 1
            : 0;
          return {
            data: all.slice(from, from + pageSize),
            has_more: from + pageSize < all.length,
          };
        },
      ),
      update: vi.fn(async (id: string) => ({
        id,
        amount: 0,
        status: "succeeded",
      })),
      create: vi.fn(async (params: { amount: number }) => ({
        id: "re_new",
        amount: params.amount,
        status: "succeeded",
      })),
    },
  };
}

function deps(
  stripe: ReturnType<typeof fakeStripe> | null,
  results: AdminResult<unknown>[],
): RefundDeps & { request: ReturnType<typeof vi.fn> } {
  const request = vi.fn();
  for (const result of results) request.mockResolvedValueOnce(result);
  return { stripe, request } as RefundDeps & {
    request: ReturnType<typeof vi.fn>;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

const REFUND: StripeRefundEvent = {
  id: "re_1",
  amount: 1500,
  currency: "eur",
  status: "succeeded",
  paymentIntent: "pi_1",
  metadata: {},
};

const EUR_ORDER: AdminResult<unknown> = {
  data: { order: { get: { id: "o1", currency: "EUR" } } },
  errors: [],
};

describe("recordStripeRefund", () => {
  it("records a settled Stripe refund on the order its payment belongs to", async () => {
    const stripe = fakeStripe();
    const d = deps(stripe, [
      EUR_ORDER,
      {
        data: {
          order: {
            refund: {
              paymentStatus: "partially_refunded",
              refundedAmount: 1500,
            },
          },
        },
        errors: [],
      },
    ]);

    const outcome = await recordStripeRefund(REFUND, d);

    expect(outcome).toEqual({
      recorded: { paymentStatus: "partially_refunded", refundedAmount: 1500 },
    });
    expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith("pi_1");
    expect(stripe.refunds.update).toHaveBeenCalledWith("re_1", {
      metadata: { recordedIn: "cmssy" },
    });
    expect(d.request).toHaveBeenLastCalledWith(
      expect.stringContaining("refund(input: $input)"),
      { input: { orderId: "o1", amount: 1500, reference: "re_1" } },
      "record the refund",
    );
  });

  it("leaves a refund cmssy started to cmssy", async () => {
    const d = deps(fakeStripe(), []);

    const outcome = await recordStripeRefund(
      { ...REFUND, metadata: { origin: "cmssy" } },
      d,
    );

    expect(outcome).toEqual({ skipped: "refund started in cmssy" });
    expect(d.request).not.toHaveBeenCalled();
  });

  it("leaves a refund it already recorded alone, so tagging it does not loop", async () => {
    const stripe = fakeStripe();
    const d = deps(stripe, []);

    expect(
      await recordStripeRefund(
        { ...REFUND, metadata: { recordedIn: "cmssy" } },
        d,
      ),
    ).toEqual({ skipped: "refund already recorded in cmssy" });
    expect(d.request).not.toHaveBeenCalled();
    expect(stripe.refunds.update).not.toHaveBeenCalled();
  });

  it("warns when a refund cmssy recorded fails afterwards", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = deps(fakeStripe(), []);

    await recordStripeRefund(
      { ...REFUND, status: "failed", metadata: { recordedIn: "cmssy" } },
      d,
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("re_1"));
    expect(d.request).not.toHaveBeenCalled();
  });

  it("does not tag a refund cmssy refused", async () => {
    const stripe = fakeStripe();
    const d = deps(stripe, [
      EUR_ORDER,
      {
        errors: [
          {
            message: "Invalid refund amount",
            extensions: { code: "BAD_USER_INPUT" },
          },
        ],
      },
    ]);

    await recordStripeRefund(REFUND, d);

    expect(stripe.refunds.update).not.toHaveBeenCalled();
  });

  it.each(["pending", "failed", "canceled", "requires_action"])(
    "waits while the refund is %s",
    async (status) => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const d = deps(fakeStripe(), []);

      expect(await recordStripeRefund({ ...REFUND, status }, d)).toEqual({
        skipped: "refund not settled",
      });
      expect(d.request).not.toHaveBeenCalled();
    },
  );

  it("skips a payment that is not a cmssy order", async () => {
    const d = deps(fakeStripe({}, { pi_1: { metadata: {} } }), []);

    expect(await recordStripeRefund(REFUND, d)).toEqual({
      skipped: "payment is not a cmssy order",
    });
    expect(d.request).not.toHaveBeenCalled();
  });

  it("hands a refund in another currency than the order's to a person", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = deps(fakeStripe(), [EUR_ORDER]);

    expect(
      await recordStripeRefund({ ...REFUND, currency: "pln", amount: 6450 }, d),
    ).toEqual({ skipped: "paid in another currency" });
    expect(d.request).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
  });

  it("reports what cmssy refuses", async () => {
    const d = deps(fakeStripe(), [
      EUR_ORDER,
      {
        errors: [
          {
            message: "Invalid refund amount",
            extensions: { code: "BAD_USER_INPUT" },
          },
        ],
      },
    ]);

    expect(await recordStripeRefund(REFUND, d)).toEqual({
      refused: "Invalid refund amount",
    });
  });

  it("throws when cmssy fails so Stripe sends the event again", async () => {
    const d = deps(fakeStripe(), [
      EUR_ORDER,
      { errors: [{ message: "boom", extensions: { code: "CONFLICT" } }] },
    ]);

    await expect(recordStripeRefund(REFUND, d)).rejects.toThrow("boom");
  });
});

function orderRead(
  refundedAmount: number,
  payments: Array<{ provider: string | null; reference: string }>,
): AdminResult<unknown> {
  return {
    data: {
      order: { get: { id: "o1", currency: "EUR", refundedAmount, payments } },
    },
    errors: [],
  };
}

const PAID = { provider: "stripe", reference: "pi_1" };

describe("refundOnStripe", () => {
  it("refunds on Stripe what cmssy refunded beyond Stripe's open refunds", async () => {
    const stripe = fakeStripe({
      pi_1: [
        { amount: 1000, status: "succeeded" },
        { amount: 300, status: "pending" },
        { amount: 700, status: "failed" },
      ],
    });
    const d = deps(stripe, [orderRead(2000, [PAID])]);

    expect(await refundOnStripe("o1", d)).toEqual({ refunded: 700 });
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      {
        payment_intent: "pi_1",
        amount: 700,
        metadata: { cmssyOrderId: "o1", origin: "cmssy" },
      },
      { idempotencyKey: "cmssy-refund-o1-pi_1-1300" },
    );
  });

  it("never sends again a refund of its own that failed on Stripe", async () => {
    const stripe = fakeStripe({
      pi_1: [{ amount: 1000, status: "failed", metadata: { origin: "cmssy" } }],
    });
    const d = deps(stripe, [orderRead(1500, [PAID])]);

    expect(await refundOnStripe("o1", d)).toEqual({ refunded: 500 });
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 500 }),
      { idempotencyKey: "cmssy-refund-o1-pi_1-1000" },
    );
  });

  it("never sends again a Dashboard refund cmssy recorded that failed later", async () => {
    const stripe = fakeStripe({
      pi_1: [
        { amount: 1000, status: "failed", metadata: { recordedIn: "cmssy" } },
      ],
    });
    const d = deps(stripe, [orderRead(1000, [PAID])]);

    expect(await refundOnStripe("o1", d)).toEqual({
      skipped: "Stripe already holds this refund",
    });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it("counts the refunds on every page Stripe lists", async () => {
    const stripe = fakeStripe(
      {
        pi_1: [
          { amount: 100, status: "succeeded" },
          { amount: 200, status: "succeeded" },
          { amount: 300, status: "succeeded" },
        ],
      },
      {},
      2,
    );
    const d = deps(stripe, [orderRead(1000, [PAID])]);

    expect(await refundOnStripe("o1", d)).toEqual({ refunded: 400 });
    expect(stripe.refunds.list).toHaveBeenCalledTimes(2);
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 400 }),
      { idempotencyKey: "cmssy-refund-o1-pi_1-600" },
    );
  });

  it("does nothing when Stripe already holds the refund", async () => {
    const stripe = fakeStripe({
      pi_1: [{ amount: 2000, status: "succeeded" }],
    });
    const d = deps(stripe, [orderRead(2000, [PAID])]);

    expect(await refundOnStripe("o1", d)).toEqual({
      skipped: "Stripe already holds this refund",
    });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it("spreads the refund over the order's payments", async () => {
    const stripe = fakeStripe(
      { pi_1: [{ amount: 4000, status: "succeeded" }] },
      { pi_1: { amount_received: 4000 }, pi_2: { amount_received: 3000 } },
    );
    const d = deps(stripe, [
      orderRead(6000, [PAID, { provider: "stripe", reference: "pi_2" }]),
    ]);

    expect(await refundOnStripe("o1", d)).toEqual({ refunded: 2000 });
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_2", amount: 2000 }),
      { idempotencyKey: "cmssy-refund-o1-pi_2-0" },
    );
  });

  it("hands a payment in another currency than the order's to a person", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const stripe = fakeStripe({}, { pi_1: { currency: "pln" } });
    const d = deps(stripe, [orderRead(1000, [PAID])]);

    expect(await refundOnStripe("o1", d)).toEqual({
      skipped: "paid in another currency",
    });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it.each([
    ["a payment recorded by hand", { provider: null, reference: "wire-1" }],
    ["a Checkout session reference", { ...PAID, reference: "cs_1" }],
  ])("leaves an order with %s alone", async (_, payment) => {
    const stripe = fakeStripe();
    const d = deps(stripe, [orderRead(1000, [PAID, payment])]);

    expect(await refundOnStripe("o1", d)).toEqual({
      skipped: "order was not paid through Stripe alone",
    });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it("reports what Stripe refuses", async () => {
    const stripe = fakeStripe();
    stripe.refunds.create.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        message: "Charge has already been refunded.",
      }),
    );
    const d = deps(stripe, [orderRead(1000, [PAID])]);

    expect(await refundOnStripe("o1", d)).toEqual({
      refused: "Charge has already been refunded.",
    });
  });

  it.each([
    [
      "Stripe cannot be reached",
      new Stripe.errors.StripeConnectionError({ message: "socket hang up" }),
    ],
    [
      "two refunds race for one key",
      new Stripe.errors.StripeIdempotencyError({ message: "Keys reused" }),
    ],
  ])("throws when %s so cmssy sends the event again", async (_, error) => {
    const stripe = fakeStripe();
    stripe.refunds.create.mockRejectedValue(error);
    const d = deps(stripe, [orderRead(1000, [PAID])]);

    await expect(refundOnStripe("o1", d)).rejects.toThrow(error.message);
  });
});
