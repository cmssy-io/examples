import type { AstroGlobal } from "astro";
import type { ShopState } from "../components/shop/island";
import { payOnline } from "../lib/stripe";
import { getCart } from "../services/cart";
import { currentUser, shopAuth } from "./context";
import { shopLocale } from "./locale";

type PageContext = Pick<AstroGlobal, "request" | "locals" | "originPathname" | "url">;

function requestPathname(astro: PageContext): string {
  return astro.originPathname.replace(/\/+$/, "") || "/";
}

export async function shopPageState(astro: PageContext): Promise<ShopState> {
  const { shop } = astro.locals;
  const [locale, cart] = await Promise.all([
    shopLocale(astro.request),
    shop.cartToken || shop.session
      ? getCart(shopAuth(shop)).catch(() => null)
      : null,
  ]);
  return {
    location: {
      ...locale,
      pathname: requestPathname(astro),
      search: astro.url.search,
    },
    user: currentUser(shop),
    cart,
    payOnline: payOnline(),
  };
}
