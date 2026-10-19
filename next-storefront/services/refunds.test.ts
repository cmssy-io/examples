import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import type { AdminResult } from "./admin";
import {
  recordStripeRefund,
  refundOnStripe,
  type RefundDeps,
  type StripeRefundEvent,
} from "./refunds";

vi.mock("@/cmssy.config", () => ({ cmssy: {} }));

function fakeStripe(
  refundsByIntent: Record<
    string,
    Array<{ amount: number; status: string }>
  > = {},
  metadata: Record<string, string> = { cmssyOrderId: "o1" },
) {
  return {
    paymentIntents: { retrieve: vi.fn(async () => ({ metadata })) },
    refunds: {
      list: vi.fn(async ({ payment_intent }: { payment_intent: string }) => ({
        data: (refundsByIntent[payment_intent] ?? []).map((r, i) => ({
          id: `re_${i}`,
          ...r,
        })),
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

const REFUND: StripeRefundEvent = {
  id: "re_1",
  amount: 1500,
  status: "succeeded",
  paymentIntent: "pi_1",
  metadata: {},
};

describe("recordStripeRefund", () => {
  it("records a settled Stripe refund on the order its payment belongs to", async () => {
    const stripe = fakeStripe();
    const d = deps(stripe, [
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
    expect(d.request).toHaveBeenCalledWith(
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

  it.each(["pending", "failed", "canceled", "requires_action"])(
    "waits while the refund is %s",
    async (status) => {
      const d = deps(fakeStripe(), []);

      expect(await recordStripeRefund({ ...REFUND, status }, d)).toEqual({
        skipped: "refund not settled",
      });
      expect(d.request).not.toHaveBeenCalled();
    },
  );

  it("skips a payment that is not a cmssy order", async () => {
    const d = deps(fakeStripe({}, {}), []);

    expect(await recordStripeRefund(REFUND, d)).toEqual({
      skipped: "payment is not a cmssy order",
    });
    expect(d.request).not.toHaveBeenCalled();
  });

  it("reports what cmssy refuses", async () => {
    const d = deps(fakeStripe(), [
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
      { errors: [{ message: "boom", extensions: { code: "CONFLICT" } }] },
    ]);

    await expect(recordStripeRefund(REFUND, d)).rejects.toThrow("boom");
  });
});

function orderRead(
  refundedAmount: number,
  payments: Array<{
    amount: number;
    provider: string | null;
    reference: string;
  }>,
): AdminResult<unknown> {
  return {
    data: { order: { get: { id: "o1", refundedAmount, payments } } },
    errors: [],
  };
}

const PAID = { amount: 5000, provider: "stripe", reference: "pi_1" };

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
    const stripe = fakeStripe({
      pi_1: [{ amount: 4000, status: "succeeded" }],
    });
    const d = deps(stripe, [
      orderRead(6000, [
        { ...PAID, amount: 4000 },
        { amount: 3000, provider: "stripe", reference: "pi_2" },
      ]),
    ]);

    expect(await refundOnStripe("o1", d)).toEqual({ refunded: 2000 });
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_2", amount: 2000 }),
      { idempotencyKey: "cmssy-refund-o1-pi_2-0" },
    );
  });

  it.each([
    [
      "a payment recorded by hand",
      { amount: 1000, provider: null, reference: "wire-1" },
    ],
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

  it("throws when Stripe cannot be reached so cmssy sends the event again", async () => {
    const stripe = fakeStripe();
    stripe.refunds.create.mockRejectedValue(
      new Stripe.errors.StripeConnectionError({ message: "socket hang up" }),
    );
    const d = deps(stripe, [orderRead(1000, [PAID])]);

    await expect(refundOnStripe("o1", d)).rejects.toThrow("socket hang up");
  });

  it("throws on an idempotency clash so cmssy sends the event again", async () => {
    const stripe = fakeStripe();
    stripe.refunds.create.mockRejectedValue(
      new Stripe.errors.StripeIdempotencyError({ message: "Keys reused" }),
    );
    const d = deps(stripe, [orderRead(1000, [PAID])]);

    await expect(refundOnStripe("o1", d)).rejects.toThrow("Keys reused");
  });
});
