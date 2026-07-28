"use server";

import type { ShippingAddressInput } from "@/graphql/generated/graphql";
import type { Cart, CheckoutOrder, Product } from "@/graphql/types";
import * as cart from "@/services/cart";
import { clearCartToken } from "@/lib/cmssy/cart-cookie";
import { parseShippingAddress } from "@/lib/cmssy/shipping-address";

export type CartResult = { cart: Cart } | { error: string };

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

export async function getCartAction(): Promise<Cart | null> {
  return cart.getCart();
}

export async function addItemAction(input: {
  recordId: string;
  quantity: number;
  variantSelections?: Record<string, string>;
}): Promise<CartResult> {
  return settle(cart.addToCart(input));
}

export async function updateItemAction(input: {
  itemId: string;
  quantity: number;
}): Promise<CartResult> {
  return settle(cart.updateItem(input));
}

export async function removeItemAction(itemId: string): Promise<CartResult> {
  return settle(cart.removeItem(itemId));
}

export async function clearCartAction(): Promise<CartResult> {
  return settle(cart.clearCart());
}

export async function applyDiscountAction(code: string): Promise<CartResult> {
  return settle(cart.applyDiscount(code));
}

export async function removeDiscountAction(): Promise<CartResult> {
  return settle(cart.removeDiscount());
}

export async function setShippingAction(
  shippingMethodId: string | null,
): Promise<CartResult> {
  return settle(cart.setShippingMethod(shippingMethodId));
}

export async function mergeCartAction(): Promise<CartResult> {
  return settle(cart.mergeCart());
}

export async function findProductAction(
  modelSlug: string,
  filter: Record<string, unknown>,
): Promise<Product | null> {
  return cart.findProduct(modelSlug, filter);
}

export type CheckoutResult = { order: CheckoutOrder } | { error: string };

export async function checkoutAction(input: {
  customerEmail: string;
  poNumber: string | null;
  customerNote: string | null;
  shippingAddress: ShippingAddressInput | null;
}): Promise<CheckoutResult> {
  try {
    const order = await cart.checkout({
      customerEmail: input.customerEmail,
      poNumber: input.poNumber,
      customerNote: input.customerNote,
      shippingAddress: parseShippingAddress(input.shippingAddress),
    });
    await clearCartToken();
    return { order };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}
