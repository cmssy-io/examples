import { createCmssyClient, graphqlRequest } from "@cmssy/core";
import { cmssy } from "@/cmssy.config";
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

export async function createPaymentSession(
  input: PaymentSessionInput,
): Promise<string | null> {
  const stripe = stripeClient();
  if (!stripe || input.amount <= 0) return null;

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
    "record order payment",
  );
  return data.order.recordPayment;
}
