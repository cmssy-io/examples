import { data } from "react-router";
import { cmssy } from "../../cmssy.config";
import type { Cart, CheckoutOrder, Product } from "../graphql/types";
import type { ShopAuth } from "../lib/cmssy/cart-request";
import { parseShippingAddress } from "../lib/cmssy/shipping-address";
import { localePath } from "../lib/locale-path";
import { copyFor } from "../lib/shop-copy";
import { siteUrlFor } from "../lib/site-url";
import * as cart from "../services/cart";
import { PRODUCT_MODEL } from "../services/catalog-models";
import { fetchOrderByToken, getMyOrder } from "../services/orders";
import { createPaymentSession } from "../services/payments";
import { resolveSiteLocales } from "../services/site";
import {
  clearCartToken,
  memberAccessToken,
  shopAuth,
  shopContext,
  type ShopRequest,
} from "../shop/context";
import type { Route } from "./+types/api-cart";

export type CartResult = { cart: Cart } | { error: string };
export type CheckoutResult =
  | { order: CheckoutOrder; paymentUrl: string | null }
  | { error: string };
export type PayOrderResult = { url: string } | { error: string };
export type FindProductResult =
  | { product: Product | null }
  | { error: string };

type Body = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
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

async function findProduct(
  auth: ShopAuth,
  body: Body,
): Promise<FindProductResult> {
  try {
    return {
      product: await cart.findProduct(auth, PRODUCT_MODEL, record(body.filter)),
    };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

async function requestLocale(value: unknown) {
  const { defaultLocale, locales } = await resolveSiteLocales();
  const requested = text(value);
  return {
    locale: locales.includes(requested) ? requested : defaultLocale,
    defaultLocale,
  };
}

async function paymentUrlFor(
  request: Request,
  localeOf: unknown,
  order: {
    id: string;
    orderNumber: number | null;
    currency: string;
    customerEmail: string;
    accessToken: string | null;
    amount: number;
  },
): Promise<string | null> {
  const { locale, defaultLocale } = await requestLocale(localeOf);
  const path = order.accessToken
    ? `/order/${order.id}?token=${encodeURIComponent(order.accessToken)}`
    : `/order/${order.id}`;
  return createPaymentSession({
    orderId: order.id,
    orderNumber: order.orderNumber,
    currency: order.currency,
    amount: order.amount,
    customerEmail: order.customerEmail,
    confirmationUrl: `${siteUrlFor(cmssy, request)}${localePath(path, locale, defaultLocale)}`,
    locale,
  });
}

async function checkout(
  request: Request,
  shop: ShopRequest,
  body: Body,
): Promise<CheckoutResult> {
  try {
    const order = await cart.checkout(shopAuth(shop), {
      customerEmail: text(body.customerEmail),
      poNumber: textOrNull(body.poNumber),
      customerNote: textOrNull(body.customerNote),
      shippingAddress: parseShippingAddress(body.shippingAddress),
    });
    clearCartToken(shop);
    let paymentUrl: string | null = null;
    try {
      paymentUrl = await paymentUrlFor(request, body.locale, {
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

async function payExistingOrder(
  request: Request,
  localeOf: unknown,
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
  const { locale } = await requestLocale(localeOf);
  const copy = copyFor(locale);
  if (!order) return { error: copy.orderNotFound };
  if (order.status === "canceled") return { error: copy.orderCanceled };
  if (order.balanceDue <= 0) return { error: copy.orderAlreadyPaid };
  const url = await paymentUrlFor(request, localeOf, {
    id: order.id,
    orderNumber: order.orderNumber ?? null,
    currency: order.currency,
    customerEmail: order.customerEmail,
    accessToken,
    amount: order.balanceDue,
  });
  return url ? { url } : { error: copy.onlinePaymentUnavailable };
}

async function payOrder(
  request: Request,
  shop: ShopRequest,
  body: Body,
): Promise<PayOrderResult> {
  const orderId = text(body.orderId);
  const token = textOrNull(body.accessToken);
  try {
    const order = token
      ? await fetchOrderByToken(orderId, token)
      : await getMyOrder(memberAccessToken(shop), orderId);
    return await payExistingOrder(request, body.locale, order, token);
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
    case "get":
      return { cart: await cart.getCart(auth()) };
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
    case "merge":
      return settle(cart.mergeCart(auth()));
    case "findProduct":
      return findProduct(auth(), body);
    case "checkout":
      return checkout(request, shop, body);
    case "payOrder":
      return payOrder(request, shop, body);
    default:
      return data({ error: "Unknown cart intent" }, { status: 400 });
  }
}
