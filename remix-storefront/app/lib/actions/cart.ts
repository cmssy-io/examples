import type { ShippingAddressInput } from "../../graphql/generated/graphql";
import type { Cart, CheckoutOrder, Product } from "../../graphql/types";

export type CartResult = { cart: Cart } | { error: string };
export type CheckoutResult =
  | { order: CheckoutOrder; paymentUrl: string | null }
  | { error: string };
export type PayOrderResult = { url: string } | { error: string };
export type FindProductResult =
  | { product: Product | null }
  | { error: string };

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

export function getCartAction(): Promise<Cart | null> {
  return post<{ cart: Cart | null }>("get").then((result) => result.cart);
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

export function mergeCartAction(): Promise<CartResult> {
  return post("merge");
}

export function findProductAction(
  filter: Record<string, unknown>,
): Promise<FindProductResult> {
  return post("findProduct", { filter });
}

export function checkoutAction(
  input: {
    customerEmail: string;
    poNumber: string | null;
    customerNote: string | null;
    shippingAddress: ShippingAddressInput | null;
  },
  locale: string,
): Promise<CheckoutResult> {
  return post("checkout", { ...input, locale });
}

export function payOrderAction(
  orderId: string,
  accessToken: string,
  locale: string,
): Promise<PayOrderResult> {
  return post("payOrder", { orderId, accessToken, locale });
}

export function payMyOrderAction(
  orderId: string,
  locale: string,
): Promise<PayOrderResult> {
  return post("payOrder", { orderId, locale });
}
