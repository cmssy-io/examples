import Stripe from "stripe";
import { payOnline, stripeClient } from "@/lib/stripe";
import { copyFor } from "@/lib/shop-copy";
import { adminRequest, errorText, isRefusal } from "@/services/admin";

export const PAYMENT_PROVIDER = "stripe";

export interface PaymentSessionInput {
  orderId: string;
  orderNumber: number | null;
  currency: string;
  amount: number;
  customerEmail: string;
  confirmationUrl: string;
  locale: string;
}

async function openSessionFor(
  stripe: Stripe,
  orderId: string,
  email: string,
) {
  const open = await stripe.checkout.sessions.list({
    status: "open",
    customer_details: { email },
    limit: 100,
  });
  return open.data.find(
    (session) => session.metadata?.cmssyOrderId === orderId,
  );
}

async function expireQuietly(stripe: Stripe, sessionId: string) {
  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeInvalidRequestError)) {
      throw error;
    }
  }
}

export async function createPaymentSession(
  input: PaymentSessionInput,
): Promise<string | null> {
  const stripe = stripeClient();
  if (!stripe || !payOnline() || input.amount <= 0) return null;

  const existing = await openSessionFor(
    stripe,
    input.orderId,
    input.customerEmail,
  );
  let supersedes = "";
  if (existing) {
    if (existing.amount_total === input.amount && existing.url) {
      return existing.url;
    }
    await expireQuietly(stripe, existing.id);
    supersedes = `-${existing.id}`;
  }

  const copy = copyFor(input.locale);
  const name = input.orderNumber
    ? `${copy.order} #${input.orderNumber}`
    : copy.order;
  const separator = input.confirmationUrl.includes("?") ? "&" : "?";

  const idempotencyKey = `cmssy-order-${input.orderId}-${input.amount}${supersedes}`;

  try {
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
      { idempotencyKey },
    );
    return session.url;
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeIdempotencyError)) throw error;
    const raced = await openSessionFor(
      stripe,
      input.orderId,
      input.customerEmail,
    );
    if (raced?.url) return raced.url;
    throw error;
  }
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

export async function recordOrderPayment(input: {
  orderId: string;
  amount: number;
  reference: string;
}): Promise<RecordPaymentOutcome> {
  const { data, errors } = await adminRequest<{
    order?: { recordPayment?: RecordedPayment };
  }>(
    RECORD_ORDER_PAYMENT,
    { input: { ...input, provider: PAYMENT_PROVIDER } },
    "record order payment",
  );
  if (errors.length === 0 && data?.order?.recordPayment) {
    return { recorded: data.order.recordPayment };
  }
  if (isRefusal(errors)) return { refused: errorText(errors) };
  throw new Error(`cmssy: record order payment error - ${errorText(errors)}`);
}
