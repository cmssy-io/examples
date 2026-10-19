import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { parseShippoEvent } from "@/lib/shippo";
import { adminToken } from "@/services/admin";
import { applyShippoEvent } from "@/services/shipments";

export const maxDuration = 30;

function tokenMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.SHIPPO_WEBHOOK_TOKEN;
  if (!expected || !adminToken()) {
    return new Response("Shippo webhook is not configured", { status: 503 });
  }
  if (!tokenMatches(new URL(request.url).searchParams.get("token"), expected)) {
    return new Response("Invalid Shippo token", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const event = parseShippoEvent(body);
  if (!event) return NextResponse.json({ received: true, handled: false });

  try {
    const outcome = await applyShippoEvent(event);
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
      applied: outcome.applied,
    });
  } catch (error) {
    console.error("Shippo webhook: parcel not updated", error);
    return new Response("Parcel not updated", { status: 500 });
  }
}
