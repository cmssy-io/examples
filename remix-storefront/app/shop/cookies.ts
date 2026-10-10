import { parse, serialize } from "cookie-es";
import {
  CART_COOKIE,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "../lib/cmssy/session-crypto";

export type ShopCookieName = typeof SESSION_COOKIE | typeof CART_COOKIE;

export function readShopCookie(
  cookieHeader: string | null,
  name: ShopCookieName,
): string {
  return cookieHeader ? (parse(cookieHeader)[name] ?? "") : "";
}

export function serializeShopCookie(
  name: ShopCookieName,
  value: string,
): string {
  const options = sessionCookieOptions();
  return serialize(name, value, {
    ...options,
    maxAge: value ? options.maxAge : 0,
  });
}
