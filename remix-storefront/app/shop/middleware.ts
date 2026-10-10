import type { Route } from "../+types/root";
import { toSessionPayload } from "../lib/cmssy/access-claims";
import { CART_COOKIE, isCartToken } from "../lib/cmssy/cart-token";
import {
  SESSION_COOKIE,
  isAccessExpired,
  openSession,
} from "../lib/cmssy/session-crypto";
import { refreshTokens } from "../services/auth";
import {
  clearSession,
  shopContext,
  writeSession,
  type ShopRequest,
} from "./context";
import { readShopCookie, serializeShopCookie } from "./cookies";

async function readSession(shop: ShopRequest, cookieHeader: string | null) {
  const raw = readShopCookie(cookieHeader, SESSION_COOKIE);
  if (!raw) return;
  const session = await openSession(raw);
  if (!session) {
    clearSession(shop);
    return;
  }
  if (!isAccessExpired(session)) {
    shop.session = session;
    return;
  }
  let result;
  try {
    result = await refreshTokens(session.refreshToken);
  } catch {
    return;
  }
  const payload = toSessionPayload(result);
  if (payload) await writeSession(shop, payload);
  else clearSession(shop);
}

export const shopMiddleware: Route.MiddlewareFunction = async (
  { request, context },
  next,
) => {
  const cookieHeader = request.headers.get("cookie");
  const storedCartToken = readShopCookie(cookieHeader, CART_COOKIE);
  const shop: ShopRequest = {
    session: null,
    cartToken: isCartToken(storedCartToken) ? storedCartToken : "",
    cookies: new Map(),
  };
  await readSession(shop, cookieHeader);
  context.set(shopContext, shop);

  const response = await next();
  for (const [name, value] of shop.cookies) {
    response.headers.append("Set-Cookie", serializeShopCookie(name, value));
  }
  return response;
};

export { SESSION_COOKIE };
