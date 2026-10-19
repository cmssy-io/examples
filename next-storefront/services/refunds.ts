import Stripe from "stripe";
import { stripeClient } from "@/lib/stripe";
import {
  adminRequest,
  errorText,
  isRefusal,
  type AdminResult,
} from "@/services/admin";
import { PAYMENT_PROVIDER } from "@/services/payments";

export const CMSSY_ORIGIN = "cmssy";

const PAGE_SIZE = 100;

const OPEN_REFUND_STATUSES = new Set([
  "pending",
  "requires_action",
  "succeeded",
]);

interface RefundRow {
  id: string;
  amount: number;
  status: string | null;
  metadata?: Record<string, string> | null;
}

interface IntentRow {
  metadata: Record<string, string>;
  currency: string;
  amount_received: number;
}

export interface RefundStripe {
  paymentIntents: {
    retrieve(id: string): Promise<IntentRow>;
  };
  refunds: {
    list(params: {
      payment_intent: string;
      limit: number;
      starting_after?: string;
    }): Promise<{ data: RefundRow[]; has_more: boolean }>;
    update(
      id: string,
      params: { metadata: Record<string, string> },
    ): Promise<RefundRow>;
    create(
      params: {
        payment_intent: string;
        amount: number;
        metadata: Record<string, string>;
      },
      options: { idempotencyKey: string },
    ): Promise<RefundRow>;
  };
}

export interface RefundDeps {
  stripe: RefundStripe | null;
  request: <T>(
    query: string,
    variables: Record<string, unknown>,
    purpose: string,
  ) => Promise<AdminResult<T>>;
}

const defaultDeps = (): RefundDeps => ({
  stripe: stripeClient(),
  request: adminRequest,
});

const REFUND_ORDER = `
  mutation RefundOrder($input: RefundOrderInput!) {
    order {
      refund(input: $input) {
        id
        paymentStatus
        refundedAmount
      }
    }
  }
`;

const ORDER_CURRENCY = `
  query OrderCurrency($id: ID!) {
    order {
      get(id: $id) {
        id
        currency
      }
    }
  }
`;

const ORDER_FOR_REFUND = `
  query OrderForRefund($id: ID!) {
    order {
      get(id: $id) {
        id
        currency
        refundedAmount
        payments { provider reference }
      }
    }
  }
`;

export interface StripeRefundEvent {
  id: string;
  amount: number;
  currency: string;
  status: string | null;
  paymentIntent: string | null;
  metadata: Record<string, string>;
}

function sameCurrency(order: string, stripe: string): boolean {
  return order.toLowerCase() === stripe.toLowerCase();
}

function countsInCmssy(refund: RefundRow): boolean {
  return (
    OPEN_REFUND_STATUSES.has(refund.status ?? "") ||
    refund.metadata?.origin === CMSSY_ORIGIN ||
    refund.metadata?.recordedIn === CMSSY_ORIGIN
  );
}

async function refundsOf(
  stripe: RefundStripe,
  paymentIntent: string,
): Promise<RefundRow[]> {
  const all: RefundRow[] = [];
  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripe.refunds.list({
      payment_intent: paymentIntent,
      limit: PAGE_SIZE,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    all.push(...page.data);
    if (!page.has_more || page.data.length === 0) return all;
    startingAfter = page.data[page.data.length - 1].id;
  }
}

function handOver(orderId: string, why: string): { skipped: string } {
  console.warn(`cmssy order ${orderId}: ${why} - settle the refund by hand`);
  return { skipped: why };
}

export function refundFromStripe(refund: Stripe.Refund): StripeRefundEvent {
  return {
    id: refund.id,
    amount: refund.amount,
    currency: refund.currency,
    status: refund.status,
    paymentIntent:
      typeof refund.payment_intent === "string"
        ? refund.payment_intent
        : (refund.payment_intent?.id ?? null),
    metadata: refund.metadata ?? {},
  };
}

export type RecordRefundOutcome =
  | { recorded: { paymentStatus: string; refundedAmount: number } }
  | { refused: string }
  | { skipped: string };

export async function recordStripeRefund(
  refund: StripeRefundEvent,
  deps: RefundDeps = defaultDeps(),
): Promise<RecordRefundOutcome> {
  if (refund.metadata.origin === CMSSY_ORIGIN) {
    if (refund.status === "failed" || refund.status === "canceled") {
      console.warn(
        `stripe refund ${refund.id} recorded in cmssy is ${refund.status} on Stripe`,
      );
    }
    return { skipped: "refund started in cmssy" };
  }
  if (refund.metadata.recordedIn === CMSSY_ORIGIN) {
    if (refund.status === "failed" || refund.status === "canceled") {
      console.warn(
        `stripe refund ${refund.id} is ${refund.status} after cmssy recorded it; the order still counts it`,
      );
    }
    return { skipped: "refund already recorded in cmssy" };
  }
  if (refund.status !== "succeeded") return { skipped: "refund not settled" };
  if (!deps.stripe || !refund.paymentIntent) {
    return { skipped: "refund is not tied to a payment" };
  }
  const intent = await deps.stripe.paymentIntents.retrieve(
    refund.paymentIntent,
  );
  const orderId = intent.metadata.cmssyOrderId;
  if (!orderId) return { skipped: "payment is not a cmssy order" };

  const read = await deps.request<{
    order?: { get?: { currency: string } | null };
  }>(ORDER_CURRENCY, { id: orderId }, "read the order to refund");
  if (isRefusal(read.errors)) return { refused: errorText(read.errors) };
  if (read.errors.length) {
    throw new Error(
      `cmssy: read the order to refund - ${errorText(read.errors)}`,
    );
  }
  const currency = read.data?.order?.get?.currency;
  if (!currency) return { skipped: "order not found" };
  if (!sameCurrency(currency, refund.currency)) {
    return handOver(orderId, "paid in another currency");
  }

  const { data, errors } = await deps.request<{
    order?: { refund?: { paymentStatus: string; refundedAmount: number } };
  }>(
    REFUND_ORDER,
    { input: { orderId, amount: refund.amount, reference: refund.id } },
    "record the refund",
  );
  if (errors.length === 0 && data?.order?.refund) {
    await deps.stripe.refunds.update(refund.id, {
      metadata: { recordedIn: CMSSY_ORIGIN },
    });
    return { recorded: data.order.refund };
  }
  if (isRefusal(errors)) return { refused: errorText(errors) };
  throw new Error(`cmssy: record the refund - ${errorText(errors)}`);
}

export type StripeRefundOutcome =
  { refunded: number } | { refused: string } | { skipped: string };

interface OrderPayment {
  provider: string | null;
  reference: string;
}

export async function refundOnStripe(
  orderId: string,
  deps: RefundDeps = defaultDeps(),
): Promise<StripeRefundOutcome> {
  const stripe = deps.stripe;
  if (!stripe) return { skipped: "Stripe is not configured" };

  const { data, errors } = await deps.request<{
    order?: {
      get?: {
        currency: string;
        refundedAmount: number;
        payments: OrderPayment[];
      } | null;
    };
  }>(ORDER_FOR_REFUND, { id: orderId }, "read the order to refund");
  if (isRefusal(errors)) return { skipped: errorText(errors) };
  if (errors.length) {
    throw new Error(`cmssy: read the order to refund - ${errorText(errors)}`);
  }
  const order = data?.order?.get;
  if (!order) return { skipped: "order not found" };
  if (order.payments.length === 0) return { skipped: "order has no payment" };
  if (
    order.payments.some(
      (p) => p.provider !== PAYMENT_PROVIDER || !p.reference.startsWith("pi_"),
    )
  ) {
    return { skipped: "order was not paid through Stripe alone" };
  }

  const held = await Promise.all(
    order.payments.map(async (payment) => {
      const [intent, refunds] = await Promise.all([
        stripe.paymentIntents.retrieve(payment.reference),
        refundsOf(stripe, payment.reference),
      ]);
      const refunded = refunds
        .filter(countsInCmssy)
        .reduce((sum, r) => sum + r.amount, 0);
      return { payment, intent, refunded };
    }),
  );
  if (held.some((h) => !sameCurrency(order.currency, h.intent.currency))) {
    return handOver(orderId, "paid in another currency");
  }
  let owed =
    order.refundedAmount - held.reduce((sum, h) => sum + h.refunded, 0);
  if (owed <= 0) return { skipped: "Stripe already holds this refund" };

  let refunded = 0;
  for (const { payment, intent, refunded: already } of held) {
    const amount = Math.min(owed, intent.amount_received - already);
    if (amount <= 0) continue;
    try {
      await stripe.refunds.create(
        {
          payment_intent: payment.reference,
          amount,
          metadata: { cmssyOrderId: orderId, origin: CMSSY_ORIGIN },
        },
        {
          idempotencyKey: `cmssy-refund-${orderId}-${payment.reference}-${already}`,
        },
      );
    } catch (error) {
      if (error instanceof Stripe.errors.StripeInvalidRequestError) {
        return { refused: error.message };
      }
      throw error;
    }
    refunded += amount;
    owed -= amount;
    if (owed === 0) break;
  }
  if (owed > 0) {
    console.warn(
      `cmssy order ${orderId} refunds ${owed} more than Stripe collected`,
    );
  }
  return refunded > 0 ? { refunded } : { skipped: "nothing left to refund" };
}
