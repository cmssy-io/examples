import { actions } from "astro:actions";
import type { ShippingAddressInput } from "../../graphql/generated/graphql";
import type { Cart, CheckoutOrder, Product } from "../../graphql/types";
import { unwrap } from "./unwrap";

export interface CheckoutInput {
  customerEmail: string;
  poNumber: string | null;
  customerNote: string | null;
  shippingAddress: ShippingAddressInput | null;
}

export interface CheckoutOutcome {
  order: CheckoutOrder;
  paymentUrl: string | null;
}

export function getCartAction(): Promise<Cart | null> {
  return actions.cart.get().then(unwrap).then((result) => result.cart);
}

export function addItemAction(input: {
  recordId: string;
  quantity: number;
  variantSelections?: Record<string, string>;
}): Promise<Cart> {
  return actions.cart.add(input).then(unwrap);
}

export function updateItemAction(input: {
  itemId: string;
  quantity: number;
}): Promise<Cart> {
  return actions.cart.update(input).then(unwrap);
}

export function removeItemAction(itemId: string): Promise<Cart> {
  return actions.cart.remove({ itemId }).then(unwrap);
}

export function clearCartAction(): Promise<Cart> {
  return actions.cart.clear().then(unwrap);
}

export function applyDiscountAction(code: string): Promise<Cart> {
  return actions.cart.applyDiscount({ code }).then(unwrap);
}

export function removeDiscountAction(): Promise<Cart> {
  return actions.cart.removeDiscount().then(unwrap);
}

export function setShippingAction(
  shippingMethodId: string | null,
): Promise<Cart> {
  return actions.cart.setShipping({ shippingMethodId }).then(unwrap);
}

export function mergeCartAction(): Promise<Cart> {
  return actions.cart.merge().then(unwrap);
}

export function findProductAction(
  filter: Record<string, unknown>,
): Promise<Product | null> {
  return actions.cart
    .findProduct({ filter })
    .then(unwrap)
    .then((result) => result.product);
}

export function checkoutAction(
  input: CheckoutInput,
  locale: string,
): Promise<CheckoutOutcome> {
  return actions.cart.checkout({ ...input, locale }).then(unwrap);
}

export function payOrderAction(
  orderId: string,
  accessToken: string,
  locale: string,
): Promise<string> {
  return actions.cart
    .payOrder({ orderId, accessToken, locale })
    .then(unwrap)
    .then((result) => result.url);
}

export function payMyOrderAction(
  orderId: string,
  locale: string,
): Promise<string> {
  return actions.cart
    .payOrder({ orderId, locale })
    .then(unwrap)
    .then((result) => result.url);
}
