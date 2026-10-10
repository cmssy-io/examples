import { Outlet } from "react-router";
import { Region } from "../cmssy/region";
import { CartDrawer } from "../components/shop/cart-drawer";
import { shopLocale } from "../lib/locale";
import { loadShopChrome } from "../shop/chrome";
import type { Route } from "./+types/shop-layout";

export async function loader({ request }: Route.LoaderArgs) {
  const { locale } = await shopLocale(request);
  return loadShopChrome(locale);
}

export default function ShopLayout({ loaderData }: Route.ComponentProps) {
  const { locale, defaultLocale, enabledLocales, layouts, header, footer } =
    loaderData;
  const region = (name: "header" | "footer") => (
    <Region
      groups={layouts}
      region={name}
      locale={locale}
      defaultLocale={defaultLocale}
      enabledLocales={enabledLocales}
      blockData={(name === "header" ? header : footer).data}
      blockContent={(name === "header" ? header : footer).content}
    />
  );

  return (
    <div className="shop-scope">
      {region("header")}
      <main className="shop-main">
        <Outlet />
      </main>
      {region("footer")}
      <CartDrawer />
    </div>
  );
}
