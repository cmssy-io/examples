import type Stripe from "stripe";
import { stripeClient, stripeWebhookSecret } from "../lib/stripe";
import { recordOrderPayment } from "../services/payments";
import type { Route } from "./+types/stripe-webhook";

const PAID_EVENTS = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export function loader() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { allow: "POST" },
  });
}

export async function action({ request }: Route.ActionArgs) {
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
    return Response.json({ received: true, handled: false });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.cmssyOrderId;
  const amount =
    session.currency_conversion?.amount_total ?? session.amount_total;
  if (session.payment_status !== "paid" || !orderId || amount === null) {
    return Response.json({ received: true, handled: false });
  }

  const reference =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? session.id);

  try {
    const outcome = await recordOrderPayment({ orderId, amount, reference });
    if ("refused" in outcome) {
      console.warn("stripe webhook: cmssy refused the payment", outcome.refused);
      return Response.json({
        received: true,
        handled: false,
        refused: outcome.refused,
      });
    }
    return Response.json({
      received: true,
      handled: true,
      paymentStatus: outcome.recorded.paymentStatus,
    });
  } catch (error) {
    console.error("stripe webhook: payment not recorded on cmssy", error);
    return new Response("Payment not recorded", { status: 500 });
  }
}
