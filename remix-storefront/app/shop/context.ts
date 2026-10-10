import { createContext } from "react-router";
import type { ShopAuth } from "../lib/cmssy/cart-request";
import { CART_COOKIE, mintCartToken } from "../lib/cmssy/cart-token";
import {
  SESSION_COOKIE,
  isAccessExpired,
  sealSession,
  type SessionPayload,
  type SessionUser,
} from "../lib/cmssy/session-crypto";
import type { ShopCookieName } from "./cookies";

export interface ShopRequest {
  session: SessionPayload | null;
  cartToken: string;
  cookies: Map<ShopCookieName, string>;
}

export const shopContext = createContext<ShopRequest>();

export function currentUser(shop: ShopRequest): SessionUser | null {
  return shop.session?.user ?? null;
}

export function memberAccessToken(shop: ShopRequest): string | undefined {
  if (!shop.session || isAccessExpired(shop.session)) return undefined;
  return shop.session.accessToken;
}

export function shopAuth(shop: ShopRequest): ShopAuth {
  if (!shop.cartToken) shop.cartToken = mintCartToken();
  shop.cookies.set(CART_COOKIE, shop.cartToken);
  return { cartToken: shop.cartToken, accessToken: memberAccessToken(shop) };
}

export async function writeSession(
  shop: ShopRequest,
  payload: SessionPayload,
): Promise<void> {
  shop.session = payload;
  shop.cookies.set(SESSION_COOKIE, await sealSession(payload));
}

export function clearSession(shop: ShopRequest): void {
  shop.session = null;
  shop.cookies.set(SESSION_COOKIE, "");
}

export function clearCartToken(shop: ShopRequest): void {
  shop.cartToken = "";
  shop.cookies.set(CART_COOKIE, "");
}
