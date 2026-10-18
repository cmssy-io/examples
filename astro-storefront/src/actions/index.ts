import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import * as cartService from "../services/cart";
import { clearCartToken, shopAuth, type ShopRequest } from "../shop/context";

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

const customFields = z
  .record(z.string(), z.unknown())
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

const cart = {
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
        cartService.setShippingMethod(shopAuth(locals.shop), shippingMethodId),
      ),
  }),
  checkout: defineAction({
    input: z.object({
      customerEmail: z.string(),
      poNumber: optionalText,
      customerNote: optionalText,
      customFields,
      shippingAddress,
    }),
    handler: async (input, { locals }) => {
      const shop: ShopRequest = locals.shop;
      const order = await settle(cartService.checkout(shopAuth(shop), input));
      clearCartToken(shop);
      return { order };
    },
  }),
};

export const server = { cart };
