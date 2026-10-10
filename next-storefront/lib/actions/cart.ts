"use server";

import type { ShippingAddressInput } from "@/graphql/generated/graphql";
import type { Cart, CheckoutOrder, Product } from "@/graphql/types";
import * as cart from "@/services/cart";
import { fetchOrderByToken, getMyOrder } from "@/services/orders";
import { createPaymentSession } from "@/services/payments";
import { clearCartToken } from "@/lib/cmssy/cart-cookie";
import { parseShippingAddress } from "@/lib/cmssy/shipping-address";
import { localePath, shopLocale } from "@/lib/locale";
import { siteUrl } from "@/lib/site-url";
import { copyFor } from "@/lib/shop-copy";

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

export type FindProductResult =
  | { product: Product | null }
  | { error: string };

export async function findProductAction(
  modelSlug: string,
  filter: Record<string, unknown>,
): Promise<FindProductResult> {
  try {
    return { product: await cart.findProduct(modelSlug, filter) };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export type CheckoutResult =
  | { order: CheckoutOrder; paymentUrl: string | null }
  | { error: string };

async function confirmationUrl(
  orderId: string,
  accessToken: string | null,
): Promise<string> {
  const { locale, defaultLocale } = await shopLocale();
  const path = accessToken
    ? `/order/${orderId}?token=${encodeURIComponent(accessToken)}`
    : `/order/${orderId}`;
  return `${siteUrl()}${localePath(path, locale, defaultLocale)}`;
}

async function paymentUrlFor(order: {
  id: string;
  orderNumber: number | null;
  currency: string;
  customerEmail: string;
  accessToken: string | null;
  amount: number;
}): Promise<string | null> {
  const { locale } = await shopLocale();
  return createPaymentSession({
    orderId: order.id,
    orderNumber: order.orderNumber,
    currency: order.currency,
    amount: order.amount,
    customerEmail: order.customerEmail,
    confirmationUrl: await confirmationUrl(order.id, order.accessToken),
    locale,
  });
}

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
    let paymentUrl: string | null = null;
    try {
      paymentUrl = await paymentUrlFor({
        id: order.id,
        orderNumber: order.orderNumber ?? null,
        currency: order.currency,
        customerEmail: order.customerEmail,
        accessToken: order.accessToken ?? null,
        amount: order.total,
      });
    } catch (err) {
      console.error("checkout: order placed, payment session not created", err);
    }
    return { order, paymentUrl };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export type PayOrderResult = { url: string } | { error: string };

async function payExistingOrder(
  order: {
    id: string;
    orderNumber?: number | null;
    status: string;
    currency: string;
    customerEmail: string;
    balanceDue: number;
  } | null,
  accessToken: string | null,
): Promise<PayOrderResult> {
  const { locale } = await shopLocale();
  const copy = copyFor(locale);
  if (!order) return { error: copy.orderNotFound };
  if (order.status === "canceled") return { error: copy.orderCanceled };
  if (order.balanceDue <= 0) return { error: copy.orderAlreadyPaid };
  const url = await paymentUrlFor({
    id: order.id,
    orderNumber: order.orderNumber ?? null,
    currency: order.currency,
    customerEmail: order.customerEmail,
    accessToken,
    amount: order.balanceDue,
  });
  return url ? { url } : { error: copy.onlinePaymentUnavailable };
}

export async function payOrderAction(
  orderId: string,
  accessToken: string,
): Promise<PayOrderResult> {
  try {
    const order = await fetchOrderByToken(orderId, accessToken);
    return await payExistingOrder(order, accessToken);
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function payMyOrderAction(
  orderId: string,
): Promise<PayOrderResult> {
  try {
    const order = await getMyOrder(orderId);
    return await payExistingOrder(order, null);
  } catch (err) {
    return { error: errorMessage(err) };
  }
}
