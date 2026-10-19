import { CmssyWebhookError, verifyCmssyWebhook } from "@cmssy/core";
import { NextResponse } from "next/server";
import { ShippingProviderError } from "@/lib/shipping";
import { adminToken } from "@/services/admin";
import { shipOrder } from "@/services/shipments";

export const maxDuration = 30;

const PENDING_RETRY_SECONDS = 60;
const LABEL_REQUESTED = "shipment.label_requested";
const HANDLED_EVENTS = new Set(["order.paid", LABEL_REQUESTED]);

export async function POST(request: Request) {
  const secret = process.env.CMSSY_WEBHOOK_SECRET;
  if (!secret || !adminToken()) {
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

  if (!HANDLED_EVENTS.has(event.event)) {
    return NextResponse.json({ received: true, handled: false });
  }

  try {
    const outcome = await shipOrder(event.data.order.id, undefined, {
      retry: event.event === LABEL_REQUESTED,
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
