import type { ShippingAddressInput } from "../../graphql/generated/graphql";
import type { Cart, CheckoutOrder } from "../../graphql/types";

export type CartResult = { cart: Cart } | { error: string };
export type CheckoutResult = { order: CheckoutOrder } | { error: string };

async function post<T>(
  intent: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch("/api/cart", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ intent, ...payload }),
  });
  if (!response.ok) {
    throw new Error(`Commerce request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function addItemAction(input: {
  recordId: string;
  quantity: number;
  variantSelections?: Record<string, string>;
}): Promise<CartResult> {
  return post("add", input);
}

export function updateItemAction(input: {
  itemId: string;
  quantity: number;
}): Promise<CartResult> {
  return post("update", input);
}

export function removeItemAction(itemId: string): Promise<CartResult> {
  return post("remove", { itemId });
}

export function clearCartAction(): Promise<CartResult> {
  return post("clear");
}

export function applyDiscountAction(code: string): Promise<CartResult> {
  return post("applyDiscount", { code });
}

export function removeDiscountAction(): Promise<CartResult> {
  return post("removeDiscount");
}

export function setShippingAction(
  shippingMethodId: string | null,
): Promise<CartResult> {
  return post("setShipping", { shippingMethodId });
}

export function checkoutAction(input: {
  customerEmail: string;
  poNumber: string | null;
  customerNote: string | null;
  shippingAddress: ShippingAddressInput | null;
}): Promise<CheckoutResult> {
  return post("checkout", input);
}
