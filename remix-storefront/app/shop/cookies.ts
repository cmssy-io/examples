import { parse, serialize } from "cookie-es";
import { CART_COOKIE, cartCookieOptions } from "../lib/cmssy/cart-token";

export function readShopCookie(
  cookieHeader: string | null,
  name: typeof CART_COOKIE,
): string {
  return cookieHeader ? (parse(cookieHeader)[name] ?? "") : "";
}

export function serializeShopCookie(
  name: typeof CART_COOKIE,
  value: string,
  secure: boolean,
): string {
  const options = cartCookieOptions(secure);
  return serialize(name, value, {
    ...options,
    maxAge: value ? options.maxAge : 0,
  });
}
