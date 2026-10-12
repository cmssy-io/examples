import { createContext } from "react-router";
import type { ShopAuth } from "../lib/cmssy/cart-request";
import { CART_COOKIE, mintCartToken } from "../lib/cmssy/cart-token";

export interface ShopRequest {
  cartToken: string;
  visitorAddress: string | null;
  cookies: Map<typeof CART_COOKIE, string>;
}

export const shopContext = createContext<ShopRequest>();

export function shopAuth(shop: ShopRequest): ShopAuth {
  if (!shop.cartToken) shop.cartToken = mintCartToken();
  shop.cookies.set(CART_COOKIE, shop.cartToken);
  return { cartToken: shop.cartToken, visitorAddress: shop.visitorAddress };
}

export function clearCartToken(shop: ShopRequest): void {
  shop.cartToken = "";
  shop.cookies.set(CART_COOKIE, "");
}
