import { data } from "react-router";
import type { Cart, CheckoutOrder } from "../graphql/types";
import { parseShippingAddress } from "../lib/cmssy/shipping-address";
import * as cart from "../services/cart";
import {
  clearCartToken,
  shopAuth,
  shopContext,
  type ShopRequest,
} from "../shop/context";
import type { Route } from "./+types/api-cart";

export type CartResult = { cart: Cart } | { error: string };
export type CheckoutResult = { order: CheckoutOrder } | { error: string };

type Body = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  const fields = record(value);
  return Object.keys(fields).length > 0 ? fields : null;
}

function quantity(value: unknown): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Commerce request failed";
}

async function settle(work: Promise<Cart>): Promise<CartResult> {
  try {
    return { cart: await work };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

async function checkout(
  shop: ShopRequest,
  body: Body,
): Promise<CheckoutResult> {
  try {
    const order = await cart.checkout(shopAuth(shop), {
      customerEmail: text(body.customerEmail),
      poNumber: textOrNull(body.poNumber),
      customerNote: textOrNull(body.customerNote),
      customFields: recordOrNull(body.customFields),
      shippingAddress: parseShippingAddress(body.shippingAddress),
    });
    clearCartToken(shop);
    return { order };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export function loader() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { allow: "POST" },
  });
}

export async function action({ request, context }: Route.ActionArgs) {
  const shop = context.get(shopContext);
  const body = record(await request.json().catch(() => null));
  const auth = () => shopAuth(shop);

  switch (body.intent) {
    case "add":
      return settle(
        cart.addToCart(auth(), {
          recordId: text(body.recordId),
          quantity: quantity(body.quantity),
          variantSelections: body.variantSelections
            ? (record(body.variantSelections) as Record<string, string>)
            : undefined,
        }),
      );
    case "update":
      return settle(
        cart.updateItem(auth(), {
          itemId: text(body.itemId),
          quantity: quantity(body.quantity),
        }),
      );
    case "remove":
      return settle(cart.removeItem(auth(), text(body.itemId)));
    case "clear":
      return settle(cart.clearCart(auth()));
    case "applyDiscount":
      return settle(cart.applyDiscount(auth(), text(body.code)));
    case "removeDiscount":
      return settle(cart.removeDiscount(auth()));
    case "setShipping":
      return settle(
        cart.setShippingMethod(auth(), textOrNull(body.shippingMethodId)),
      );
    case "checkout":
      return checkout(shop, body);
    default:
      return data({ error: "Unknown cart intent" }, { status: 400 });
  }
}
