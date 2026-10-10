import { AccountPanel } from "../components/shop/account-panel";
import { OrderHistory } from "../components/shop/order-history";
import { ShopErrorBoundary } from "../components/shop/shop-error";
import { shopRouteLocale } from "../lib/locale";
import { copyFor } from "../lib/shop-copy";
import { payOnline } from "../lib/stripe";
import { listMyOrders } from "../services/orders";
import { currentUser, memberAccessToken, shopContext } from "../shop/context";
import type { Route } from "./+types/account";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const shop = context.get(shopContext);
  const { locale } = await shopRouteLocale(request, params);
  const user = currentUser(shop);
  const orders = user
    ? (await listMyOrders(memberAccessToken(shop))).items
    : [];
  return { locale, user, orders, payOnline: payOnline() };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  return [{ title: `${copyFor(loaderData.locale).tradeAccount} - MACHTEC` }];
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <ShopErrorBoundary error={error} />;
}

export default function AccountPage({ loaderData }: Route.ComponentProps) {
  const { locale, user, orders, payOnline } = loaderData;
  const copy = copyFor(locale);
  return (
    <>
      <h1 style={{ marginTop: 0 }}>{copy.tradeAccount}</h1>
      <AccountPanel />
      {user ? <OrderHistory orders={orders} payOnline={payOnline} /> : null}
    </>
  );
}
