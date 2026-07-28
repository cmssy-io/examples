import type { NextRequest } from "next/server";
import { createCmssyProxy, type CmssyProxyCookie } from "@cmssy/next/middleware";
import { cmssy } from "@/cmssy.config";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/cmssy/session-crypto";
import { refreshMemberSession } from "@/lib/cmssy/session-refresh";
import { CART_COOKIE, mintCartToken } from "@/lib/cmssy/cart-token";

async function cookies(request: NextRequest): Promise<CmssyProxyCookie[]> {
  const writes: CmssyProxyCookie[] = [];
  const options = sessionCookieOptions();

  const refresh = await refreshMemberSession(request);
  if (refresh) {
    writes.push({ name: SESSION_COOKIE, value: refresh.sealed, options });
  }

  if (!request.cookies.get(CART_COOKIE)?.value) {
    writes.push({ name: CART_COOKIE, value: mintCartToken(), options });
  }

  return writes;
}

export const proxy = createCmssyProxy(cmssy, {
  // The storefront routes are static paths, not a catch-all, so /no/cart has to
  // reach /cart.
  stripLocalePrefix: true,
  cookies,
});

export const config = {
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
