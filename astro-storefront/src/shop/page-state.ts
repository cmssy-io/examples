import type { AstroGlobal } from "astro";
import type { ShopState } from "../components/shop/island";
import type { Cart } from "../graphql/types";
import { getCart } from "../services/cart";
import { clearCartToken, shopAuth, type ShopRequest } from "./context";
import { shopLocale } from "./locale";

type PageContext = Pick<
  AstroGlobal,
  "request" | "locals" | "originPathname" | "url"
>;

function requestPathname(astro: PageContext): string {
  return astro.originPathname.replace(/\/+$/, "") || "/";
}

function guestCart(shop: ShopRequest, cart: Cart | null): Cart | null {
  if (!cart?.userId) return cart;
  clearCartToken(shop);
  return null;
}

export async function shopPageState(astro: PageContext): Promise<ShopState> {
  const { shop } = astro.locals;
  const [locale, cart] = await Promise.all([
    shopLocale(astro.request),
    shop.cartToken ? getCart(shopAuth(shop)).catch(() => null) : null,
  ]);
  return {
    location: {
      ...locale,
      pathname: requestPathname(astro),
      search: astro.url.search,
    },
    cart: guestCart(shop, cart),
  };
}
