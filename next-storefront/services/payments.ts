import { DEFAULT_CMSSY_API_URL, createCmssyClient } from "@cmssy/core";
import { cmssy } from "@/cmssy.config";
import type Stripe from "stripe";
import { stripeClient } from "@/lib/stripe";
import { copyFor } from "@/lib/shop-copy";

export const PAYMENT_PROVIDER = "stripe";

const client = createCmssyClient(cmssy);

export interface PaymentSessionInput {
  orderId: string;
  orderNumber: number | null;
  currency: string;
  amount: number;
  customerEmail: string;
  confirmationUrl: string;
  locale: string;
}

async function openSessionFor(stripe: Stripe, orderId: string) {
  const open = await stripe.checkout.sessions.list({
    status: "open",
    limit: 100,
  });
  return open.data.find(
    (session) => session.metadata?.cmssyOrderId === orderId,
  );
}

export async function createPaymentSession(
  input: PaymentSessionInput,
): Promise<string | null> {
  const stripe = stripeClient();
  if (!stripe || input.amount <= 0) return null;

  const existing = await openSessionFor(stripe, input.orderId);
  if (existing) {
    if (existing.amount_total === input.amount && existing.url) {
      return existing.url;
    }
    await stripe.checkout.sessions.expire(existing.id);
  }

  const copy = copyFor(input.locale);
  const name = input.orderNumber
    ? `${copy.order} #${input.orderNumber}`
    : copy.order;
  const separator = input.confirmationUrl.includes("?") ? "&" : "?";

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: input.orderId,
      customer_email: input.customerEmail,
      metadata: { cmssyOrderId: input.orderId },
      payment_intent_data: { metadata: { cmssyOrderId: input.orderId } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amount,
            product_data: { name },
          },
        },
      ],
      success_url: `${input.confirmationUrl}${separator}paid=1`,
      cancel_url: input.confirmationUrl,
    },
    {
      idempotencyKey: `cmssy-order-${input.orderId}-${input.amount}-${input.locale}`,
    },
  );

  return session.url;
}

const RECORD_ORDER_PAYMENT = `
  mutation RecordOrderPayment($input: RecordOrderPaymentInput!) {
    order {
      recordPayment(input: $input) {
        id
        paymentStatus
        amountPaid
        balanceDue
      }
    }
  }
`;

export interface RecordedPayment {
  id: string;
  paymentStatus: string;
  amountPaid: number;
  balanceDue: number;
}

export type RecordPaymentOutcome =
  | { recorded: RecordedPayment }
  | { refused: string };

const REFUSAL_CODES = new Set(["BAD_USER_INPUT", "NOT_FOUND"]);

interface GraphqlError {
  message?: string;
  extensions?: { code?: string };
}

function adminEndpoint(): string {
  return process.env.CMSSY_API_URL?.trim() || DEFAULT_CMSSY_API_URL;
}

export async function recordOrderPayment(input: {
  orderId: string;
  amount: number;
  reference: string;
}): Promise<RecordPaymentOutcome> {
  const token = process.env.CMSSY_API_TOKEN;
  if (!token) {
    throw new Error(
      "CMSSY_API_TOKEN is not set: a payment cannot be recorded on the order",
    );
  }
  const workspaceId = await client.resolveWorkspaceId();

  const response = await fetch(adminEndpoint(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      "x-workspace-id": workspaceId,
    },
    body: JSON.stringify({
      query: RECORD_ORDER_PAYMENT,
      variables: { input: { ...input, provider: PAYMENT_PROVIDER } },
    }),
  });
  if (!response.ok) {
    throw new Error(`cmssy: record order payment failed (${response.status})`);
  }
  const json = (await response.json()) as {
    data?: { order?: { recordPayment?: RecordedPayment } };
    errors?: GraphqlError[];
  };
  const errors = json.errors ?? [];
  if (errors.length === 0 && json.data?.order?.recordPayment) {
    return { recorded: json.data.order.recordPayment };
  }
  const message = errors
    .map((error) => error.message ?? "GraphQL error")
    .join("; ");
  if (
    errors.length > 0 &&
    errors.every((error) => REFUSAL_CODES.has(error.extensions?.code ?? ""))
  ) {
    return { refused: message };
  }
  throw new Error(`cmssy: record order payment error - ${message}`);
}
