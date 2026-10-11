import { defineMiddleware } from "astro:middleware";
import {
  CART_COOKIE,
  isCartToken,
  requestIsSecure,
} from "../lib/cmssy/cart-token";
import type { ShopRequest } from "./context";

export const shopMiddleware = defineMiddleware(
  async ({ cookies, locals, url, request }, next) => {
    const stored = cookies.get(CART_COOKIE)?.value ?? "";
    const shop: ShopRequest = {
      cartToken: isCartToken(stored) ? stored : "",
      cookies,
      secure: requestIsSecure(url, request.headers),
    };
    locals.shop = shop;
    return next();
  },
);
