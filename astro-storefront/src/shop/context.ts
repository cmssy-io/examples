import type { AstroCookies } from "astro";
import type { ShopAuth } from "../lib/cmssy/cart-request";
import { CART_COOKIE, mintCartToken } from "../lib/cmssy/cart-token";
import {
  SESSION_COOKIE,
  isAccessExpired,
  sealSession,
  sessionCookieOptions,
  type SessionPayload,
  type SessionUser,
} from "../lib/cmssy/session-crypto";

export interface ShopRequest {
  session: SessionPayload | null;
  cartToken: string;
  cookies: AstroCookies;
  secure: boolean;
}

type ShopCookieName = typeof SESSION_COOKIE | typeof CART_COOKIE;

function writeCookie(shop: ShopRequest, name: ShopCookieName, value: string) {
  if (value) shop.cookies.set(name, value, sessionCookieOptions(shop.secure));
  else shop.cookies.delete(name, { path: "/" });
}

export function currentUser(shop: ShopRequest): SessionUser | null {
  return shop.session?.user ?? null;
}

export function memberAccessToken(shop: ShopRequest): string | undefined {
  if (!shop.session || isAccessExpired(shop.session)) return undefined;
  return shop.session.accessToken;
}

export function shopAuth(shop: ShopRequest): ShopAuth {
  if (!shop.cartToken) shop.cartToken = mintCartToken();
  writeCookie(shop, CART_COOKIE, shop.cartToken);
  return { cartToken: shop.cartToken, accessToken: memberAccessToken(shop) };
}

export async function writeSession(
  shop: ShopRequest,
  payload: SessionPayload,
): Promise<void> {
  shop.session = payload;
  writeCookie(shop, SESSION_COOKIE, await sealSession(payload));
}

export function clearSession(shop: ShopRequest): void {
  shop.session = null;
  writeCookie(shop, SESSION_COOKIE, "");
}

export function clearCartToken(shop: ShopRequest): void {
  shop.cartToken = "";
  writeCookie(shop, CART_COOKIE, "");
}
