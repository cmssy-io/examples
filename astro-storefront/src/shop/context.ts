import type { AstroCookies } from "astro";
import type { ShopAuth } from "../lib/cmssy/cart-request";
import {
  CART_COOKIE,
  cartCookieOptions,
  mintCartToken,
} from "../lib/cmssy/cart-token";

export interface ShopRequest {
  cartToken: string;
  visitorAddress: string | null;
  cookies: AstroCookies;
  secure: boolean;
}

function writeCartCookie(shop: ShopRequest, value: string) {
  if (value) {
    shop.cookies.set(CART_COOKIE, value, cartCookieOptions(shop.secure));
  } else {
    shop.cookies.delete(CART_COOKIE, { path: "/" });
  }
}

export function shopAuth(shop: ShopRequest): ShopAuth {
  if (!shop.cartToken) shop.cartToken = mintCartToken();
  writeCartCookie(shop, shop.cartToken);
  return { cartToken: shop.cartToken, visitorAddress: shop.visitorAddress };
}

export function clearCartToken(shop: ShopRequest): void {
  shop.cartToken = "";
  writeCartCookie(shop, "");
}
