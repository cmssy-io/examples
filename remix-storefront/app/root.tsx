import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
} from "react-router";
import type { Route } from "./+types/root";
import { CartProvider } from "./components/shop/cart-provider";
import { CartUiProvider } from "./components/shop/cart-ui";
import { LocaleProvider } from "./components/shop/locale-ui";
import { shopLocale } from "./lib/locale";
import { getCart } from "./services/cart";
import {
  clearCartToken,
  shopAuth,
  shopContext,
  type ShopRequest,
} from "./shop/context";
import type { Cart } from "./graphql/types";
import { shopMiddleware } from "./shop/middleware";
import shopStyles from "./styles/shop.css?url";

export const middleware: Route.MiddlewareFunction[] = [shopMiddleware];

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
  { rel: "stylesheet", href: shopStyles },
];

function guestCart(shop: ShopRequest, cart: Cart | null): Cart | null {
  if (!cart?.userId) return cart;
  clearCartToken(shop);
  return null;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const shop = context.get(shopContext);
  const [{ locale, defaultLocale, locales }, cart] = await Promise.all([
    shopLocale(request),
    shop.cartToken ? getCart(shopAuth(shop)).catch(() => null) : null,
  ]);
  return {
    locale,
    defaultLocale,
    locales,
    cart: guestCart(shop, cart),
  };
}

interface LocaleData {
  locale?: string;
  defaultLocale?: string;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const matches = useMatches();
  const data = matches.reduce<LocaleData>(
    (found, match) => (match.loaderData as LocaleData | undefined) ?? found,
    {},
  );

  return (
    <html lang={data.locale ?? data.defaultLocale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { locale, defaultLocale, locales, cart } = loaderData;
  return (
    <LocaleProvider value={{ locale, defaultLocale, locales }}>
      <CartProvider initialCart={cart}>
        <CartUiProvider>
          <Outlet />
        </CartUiProvider>
      </CartProvider>
    </LocaleProvider>
  );
}
