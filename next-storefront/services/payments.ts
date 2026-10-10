import { CmssyRequestError, createCmssyClient, graphqlRequest } from "@cmssy/core";
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

  const session = await stripe.checkout.sessions.create({
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
  });

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

const RECORD_PAYMENT_LABEL = "record order payment";

export class OrderPaymentRefused extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderPaymentRefused";
  }
}

export async function recordOrderPayment(input: {
  orderId: string;
  amount: number;
  reference: string;
}): Promise<RecordedPayment> {
  const token = process.env.CMSSY_API_TOKEN;
  if (!token) {
    throw new Error(
      "CMSSY_API_TOKEN is not set: a payment cannot be recorded on the order",
    );
  }
  const workspaceId = await client.resolveWorkspaceId();

  try {
    const data = await graphqlRequest<{
      order: { recordPayment: RecordedPayment };
    }>(
      cmssy,
      RECORD_ORDER_PAYMENT,
      { input: { ...input, provider: PAYMENT_PROVIDER } },
      {
        headers: {
          authorization: `Bearer ${token}`,
          "x-workspace-id": workspaceId,
        },
      },
      RECORD_PAYMENT_LABEL,
    );
    return data.order.recordPayment;
  } catch (error) {
    if (
      error instanceof Error &&
      !(error instanceof CmssyRequestError) &&
      error.message.startsWith(`cmssy: ${RECORD_PAYMENT_LABEL} error`)
    ) {
      throw new OrderPaymentRefused(error.message);
    }
    throw error;
  }
}
