import { defineMiddleware } from "astro:middleware";
import { toSessionPayload } from "../lib/cmssy/access-claims";
import { CART_COOKIE, isCartToken } from "../lib/cmssy/cart-token";
import {
  SESSION_COOKIE,
  isAccessExpired,
  openSession,
} from "../lib/cmssy/session-crypto";
import { refreshTokens } from "../services/auth";
import { clearSession, writeSession, type ShopRequest } from "./context";

async function restoreSession(shop: ShopRequest): Promise<void> {
  const raw = shop.cookies.get(SESSION_COOKIE)?.value;
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

export const shopMiddleware = defineMiddleware(
  async ({ cookies, locals, url }, next) => {
    const stored = cookies.get(CART_COOKIE)?.value ?? "";
    const shop: ShopRequest = {
      session: null,
      cartToken: isCartToken(stored) ? stored : "",
      cookies,
      secure: url.protocol === "https:",
    };
    await restoreSession(shop);
    locals.shop = shop;
    return next();
  },
);
