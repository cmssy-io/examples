import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { stripeClient, stripeWebhookSecret } from "@/lib/stripe";
import { OrderPaymentRefused, recordOrderPayment } from "@/services/payments";

const PAID_EVENTS = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export async function POST(request: Request) {
  const stripe = stripeClient();
  const secret = stripeWebhookSecret();
  if (!stripe || !secret) {
    return new Response("Stripe is not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe-Signature header", { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret,
    );
  } catch {
    return new Response("Invalid Stripe signature", { status: 400 });
  }

  if (!PAID_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, handled: false });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.cmssyOrderId;
  if (
    session.payment_status !== "paid" ||
    !orderId ||
    session.amount_total === null
  ) {
    return NextResponse.json({ received: true, handled: false });
  }

  const reference =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? session.id);

  try {
    const order = await recordOrderPayment({
      orderId,
      amount: session.amount_total,
      reference,
    });
    return NextResponse.json({
      received: true,
      handled: true,
      paymentStatus: order.paymentStatus,
    });
  } catch (error) {
    if (error instanceof OrderPaymentRefused) {
      console.warn("stripe webhook: cmssy refused the payment", error.message);
      return NextResponse.json({
        received: true,
        handled: false,
        refused: error.message,
      });
    }
    console.error("stripe webhook: payment not recorded on cmssy", error);
    return new Response("Payment not recorded", { status: 500 });
  }
}
