import type { Route } from "../+types/root";
import {
  CART_COOKIE,
  isCartToken,
  requestIsSecure,
} from "../lib/cmssy/cart-token";
import { shopContext, type ShopRequest } from "./context";
import { readShopCookie, serializeShopCookie } from "./cookies";

export const shopMiddleware: Route.MiddlewareFunction = async (
  { request, context },
  next,
) => {
  const storedCartToken = readShopCookie(
    request.headers.get("cookie"),
    CART_COOKIE,
  );
  const shop: ShopRequest = {
    cartToken: isCartToken(storedCartToken) ? storedCartToken : "",
    cookies: new Map(),
  };
  context.set(shopContext, shop);

  const response = await next();
  const secure = requestIsSecure(new URL(request.url), request.headers);
  for (const [name, value] of shop.cookies) {
    response.headers.append(
      "Set-Cookie",
      serializeShopCookie(name, value, secure),
    );
  }
  return response;
};
