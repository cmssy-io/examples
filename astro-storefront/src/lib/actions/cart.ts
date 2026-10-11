import { actions } from "astro:actions";
import type { ShippingAddressInput } from "../../graphql/generated/graphql";
import type { Cart, CheckoutOrder } from "../../graphql/types";
import { unwrap } from "./unwrap";

export interface CheckoutInput {
  customerEmail: string;
  poNumber: string | null;
  customerNote: string | null;
  shippingAddress: ShippingAddressInput | null;
}

export interface CheckoutOutcome {
  order: CheckoutOrder;
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

export function checkoutAction(input: CheckoutInput): Promise<CheckoutOutcome> {
  return actions.cart.checkout(input).then(unwrap);
}
