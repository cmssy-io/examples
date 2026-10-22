import {
  CmssyWebhookError,
  verifyCmssyWebhook,
  type CmssyWebhookAccountEvent,
  type CmssyWebhookEvent,
  type CmssyWebhookReturn,
} from "@cmssy/core";
import { NextResponse } from "next/server";
import {
  accountMail,
  accountMailSender,
  isAccountEvent,
} from "@/lib/account-mail";
import { idempotencyKey } from "@/lib/mailer";
import { ShippingProviderError } from "@/lib/shipping";
import { adminToken } from "@/services/admin";
import { mailOrderEvent, ORDER_MAIL_EVENTS } from "@/services/order-mails";
import { fetchMailBrand } from "@/services/site";
import { refundOnStripe } from "@/services/refunds";
import { shipOrder } from "@/services/shipments";

export const maxDuration = 30;

const PENDING_RETRY_SECONDS = 60;
const LABEL_REQUESTED = "shipment.label_requested";
const REFUND_EVENTS = new Set(["order.refunded", "order.partially_refunded"]);
const RETURN_EVENT_PREFIX = "return.";
const HANDLED_EVENTS = new Set(["order.paid", LABEL_REQUESTED]);

function requestedShipment(data: object): string | undefined {
  const shipment = (data as { shipment?: { id?: unknown } }).shipment;
  return typeof shipment?.id === "string" ? shipment.id : undefined;
}

function acknowledgeReturn(event: string, ret: CmssyWebhookReturn | undefined) {
  if (!ret) return NextResponse.json({ received: true, handled: false });
  console.info("cmssy webhook: return", event, {
    returnId: ret.id,
    number: ret.number,
    status: ret.status,
  });
  return NextResponse.json({
    received: true,
    handled: true,
    returnId: ret.id,
    status: ret.status,
  });
}

async function mailAccount(event: CmssyWebhookAccountEvent) {
  try {
    const mail = accountMail(event, await fetchMailBrand());
    await accountMailSender().send(mail, idempotencyKey(event));
    return NextResponse.json({ received: true, handled: true });
  } catch (error) {
    console.error("cmssy webhook: account mail not sent", error);
    return new Response("Account mail not sent", { status: 500 });
  }
}

async function mailOrder(event: CmssyWebhookEvent) {
  try {
    const mail = await mailOrderEvent(event);
    if (mail === "no_admin_token") {
      return new Response("cmssy webhook is not configured", { status: 503 });
    }
    return NextResponse.json({
      received: true,
      handled: mail === "sent" || mail === "duplicate",
      mail,
    });
  } catch (error) {
    console.error("cmssy webhook: order mail not sent", error);
    return new Response("Order mail not sent", { status: 500 });
  }
}

async function refundOrder(orderId: string) {
  try {
    const outcome = await refundOnStripe(orderId);
    if ("refunded" in outcome) {
      return NextResponse.json({
        received: true,
        handled: true,
        refunded: outcome.refunded,
      });
    }
    if ("refused" in outcome) {
      console.warn("cmssy webhook: Stripe refused the refund", outcome.refused);
    }
    return NextResponse.json({ received: true, handled: false, ...outcome });
  } catch (error) {
    console.error("cmssy webhook: refund not made on Stripe", error);
    return new Response("Refund not made", { status: 500 });
  }
}

export async function POST(request: Request) {
  const secret = process.env.CMSSY_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("cmssy webhook is not configured", { status: 503 });
  }

  const body = await request.text();
  let event;
  try {
    event = await verifyCmssyWebhook({
      body,
      signatureHeader: request.headers.get("x-cmssy-signature"),
      secret,
    });
  } catch (error) {
    if (error instanceof CmssyWebhookError) {
      return new Response("Invalid cmssy signature", { status: 401 });
    }
    throw error;
  }

  if (isAccountEvent(event.event)) {
    return mailAccount(event as unknown as CmssyWebhookAccountEvent);
  }
  if (event.event.startsWith(RETURN_EVENT_PREFIX)) {
    return acknowledgeReturn(event.event, event.data.return);
  }
  if (ORDER_MAIL_EVENTS.has(event.event)) {
    return mailOrder(event);
  }
  if (!REFUND_EVENTS.has(event.event) && !HANDLED_EVENTS.has(event.event)) {
    return NextResponse.json({ received: true, handled: false });
  }
  if (!adminToken()) {
    return new Response("cmssy webhook is not configured", { status: 503 });
  }
  if (REFUND_EVENTS.has(event.event)) {
    return refundOrder(event.data.order.id);
  }

  try {
    const outcome = await shipOrder(event.data.order.id, undefined, {
      retryOf:
        event.event === LABEL_REQUESTED ? requestedShipment(event.data) : undefined,
    });
    if ("pending" in outcome) {
      return NextResponse.json(
        { received: true, handled: false, pending: outcome.pending },
        {
          status: 503,
          headers: { "retry-after": String(PENDING_RETRY_SECONDS) },
        },
      );
    }
    if ("skipped" in outcome) {
      return NextResponse.json({
        received: true,
        handled: false,
        skipped: outcome.skipped,
      });
    }
    return NextResponse.json({
      received: true,
      handled: true,
      carrier: outcome.shipped.carrier,
      trackingNumber: outcome.shipped.trackingNumber,
    });
  } catch (error) {
    if (error instanceof ShippingProviderError && !error.retryable) {
      console.warn("cmssy webhook: carrier refused the shipment", error.message);
      return NextResponse.json({
        received: true,
        handled: false,
        refused: error.message,
      });
    }
    console.error("cmssy webhook: shipment not booked", error);
    return new Response("Shipment not booked", { status: 500 });
  }
}
