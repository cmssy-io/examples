import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { cmssy } from "../cmssy.config";
import { toSessionPayload } from "../lib/cmssy/access-claims";
import { localePath } from "../lib/locale-path";
import { copyFor } from "../lib/shop-copy";
import { siteUrlFor } from "../lib/site-url";
import * as authService from "../services/auth";
import * as cartService from "../services/cart";
import { PRODUCT_MODEL } from "../services/catalog-models";
import { fetchOrderByToken, getMyOrder } from "../services/orders";
import { createPaymentSession } from "../services/payments";
import { resolveSiteLocales } from "../services/site";
import {
  clearCartToken,
  clearSession,
  memberAccessToken,
  shopAuth,
  writeSession,
  type ShopRequest,
} from "../shop/context";

const optionalText = z.string().nullable().default(null);

const shippingAddress = z
  .object({
    name: z.string(),
    company: optionalText,
    line1: z.string(),
    line2: optionalText,
    postalCode: z.string(),
    city: z.string(),
    region: optionalText,
    country: z.string(),
    phone: optionalText,
    vatId: optionalText,
  })
  .nullable()
  .default(null);

const quantity = z.number().int().positive().default(1);

function refused(err: unknown): ActionError {
  return new ActionError({
    code: "BAD_REQUEST",
    message:
      err instanceof Error && err.message
        ? err.message
        : "Commerce request failed",
  });
}

async function settle<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (err) {
    throw refused(err);
  }
}

async function requestLocale(requested: string) {
  const { defaultLocale, locales } = await resolveSiteLocales();
  return {
    locale: locales.includes(requested) ? requested : defaultLocale,
    defaultLocale,
  };
}

interface PayableOrder {
  id: string;
  orderNumber: number | null;
  currency: string;
  customerEmail: string;
  accessToken: string | null;
  amount: number;
}

async function paymentUrlFor(
  url: URL,
  requested: string,
  order: PayableOrder,
): Promise<string | null> {
  const { locale, defaultLocale } = await requestLocale(requested);
  const path = order.accessToken
    ? `/order/${order.id}?token=${encodeURIComponent(order.accessToken)}`
    : `/order/${order.id}`;
  return createPaymentSession({
    orderId: order.id,
    orderNumber: order.orderNumber,
    currency: order.currency,
    amount: order.amount,
    customerEmail: order.customerEmail,
    confirmationUrl: `${siteUrlFor(cmssy, url)}${localePath(path, locale, defaultLocale)}`,
    locale,
  });
}

async function payExistingOrder(
  url: URL,
  requested: string,
  order: {
    id: string;
    orderNumber?: number | null;
    status: string;
    currency: string;
    customerEmail: string;
    balanceDue: number;
  } | null,
  accessToken: string | null,
): Promise<{ url: string }> {
  const { locale } = await requestLocale(requested);
  const copy = copyFor(locale);
  const refuse = (message: string) =>
    new ActionError({ code: "BAD_REQUEST", message });
  if (!order) throw refuse(copy.orderNotFound);
  if (order.status === "canceled") throw refuse(copy.orderCanceled);
  if (order.balanceDue <= 0) throw refuse(copy.orderAlreadyPaid);
  const paymentUrl = await paymentUrlFor(url, requested, {
    id: order.id,
    orderNumber: order.orderNumber ?? null,
    currency: order.currency,
    customerEmail: order.customerEmail,
    accessToken,
    amount: order.balanceDue,
  });
  if (!paymentUrl) throw refuse(copy.onlinePaymentUnavailable);
  return { url: paymentUrl };
}

const cart = {
  get: defineAction({
    handler: async (_input, { locals }) => ({
      cart: await settle(cartService.getCart(shopAuth(locals.shop))),
    }),
  }),
  add: defineAction({
    input: z.object({
      recordId: z.string(),
      quantity,
      variantSelections: z.record(z.string(), z.string()).optional(),
    }),
    handler: (input, { locals }) =>
      settle(cartService.addToCart(shopAuth(locals.shop), input)),
  }),
  update: defineAction({
    input: z.object({ itemId: z.string(), quantity }),
    handler: (input, { locals }) =>
      settle(cartService.updateItem(shopAuth(locals.shop), input)),
  }),
  remove: defineAction({
    input: z.object({ itemId: z.string() }),
    handler: ({ itemId }, { locals }) =>
      settle(cartService.removeItem(shopAuth(locals.shop), itemId)),
  }),
  clear: defineAction({
    handler: (_input, { locals }) =>
      settle(cartService.clearCart(shopAuth(locals.shop))),
  }),
  applyDiscount: defineAction({
    input: z.object({ code: z.string() }),
    handler: ({ code }, { locals }) =>
      settle(cartService.applyDiscount(shopAuth(locals.shop), code)),
  }),
  removeDiscount: defineAction({
    handler: (_input, { locals }) =>
      settle(cartService.removeDiscount(shopAuth(locals.shop))),
  }),
  setShipping: defineAction({
    input: z.object({ shippingMethodId: optionalText }),
    handler: ({ shippingMethodId }, { locals }) =>
      settle(
        cartService.setShippingMethod(
          shopAuth(locals.shop),
          shippingMethodId,
        ),
      ),
  }),
  merge: defineAction({
    handler: (_input, { locals }) =>
      settle(cartService.mergeCart(shopAuth(locals.shop))),
  }),
  findProduct: defineAction({
    input: z.object({ filter: z.record(z.string(), z.unknown()) }),
    handler: async ({ filter }, { locals }) => ({
      product: await settle(
        cartService.findProduct(shopAuth(locals.shop), PRODUCT_MODEL, filter),
      ),
    }),
  }),
  checkout: defineAction({
    input: z.object({
      customerEmail: z.string(),
      poNumber: optionalText,
      customerNote: optionalText,
      shippingAddress,
      locale: z.string().default(""),
    }),
    handler: async ({ locale, ...input }, { locals, url }) => {
      const shop: ShopRequest = locals.shop;
      const order = await settle(cartService.checkout(shopAuth(shop), input));
      clearCartToken(shop);
      let paymentUrl: string | null = null;
      try {
        paymentUrl = await paymentUrlFor(url, locale, {
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
    },
  }),
  payOrder: defineAction({
    input: z.object({
      orderId: z.string(),
      accessToken: optionalText,
      locale: z.string().default(""),
    }),
    handler: async ({ orderId, accessToken, locale }, { locals, url }) => {
      const order = await settle(
        accessToken
          ? fetchOrderByToken(orderId, accessToken)
          : getMyOrder(memberAccessToken(locals.shop), orderId),
      );
      return payExistingOrder(url, locale, order, accessToken);
    },
  }),
};

const credentials = z.object({ identity: z.string(), password: z.string() });

const auth = {
  signIn: defineAction({
    input: credentials,
    handler: async ({ identity, password }, { locals }) => {
      const result = await settle(authService.signIn(identity, password));
      const payload = toSessionPayload(result);
      if (!payload) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: result.message || "Sign in failed.",
        });
      }
      await writeSession(locals.shop, payload);
      return { user: payload.user };
    },
  }),
  register: defineAction({
    input: credentials.extend({ fields: z.record(z.string(), z.unknown()).default({}) }),
    handler: async ({ identity, password, fields }) => {
      const result = await settle(
        authService.register(identity, password, fields),
      );
      if (!result.success) {
        throw new ActionError({ code: "BAD_REQUEST", message: result.message });
      }
      return { message: result.message };
    },
  }),
  signOut: defineAction({
    handler: async (_input, { locals }) => {
      const shop: ShopRequest = locals.shop;
      if (shop.session) {
        await authService.signOut(shop.session.refreshToken).catch(() => undefined);
      }
      clearSession(shop);
      clearCartToken(shop);
      return { ok: true };
    },
  }),
};

export const server = { cart, auth };
