import { CartView } from "../components/shop/cart-view";
import { ShopErrorBoundary } from "../components/shop/shop-error";
import { shopRouteLocale } from "../lib/locale";
import { copyFor } from "../lib/shop-copy";
import { payOnline } from "../lib/stripe";
import type { Route } from "./+types/cart";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { locale } = await shopRouteLocale(request, params);
  return { locale, payOnline: payOnline() };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  return [{ title: `${copyFor(loaderData.locale).cart} - MACHTEC` }];
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <ShopErrorBoundary error={error} />;
}

export default function CartPage({ loaderData }: Route.ComponentProps) {
  const copy = copyFor(loaderData.locale);
  return (
    <>
      <h1 style={{ marginTop: 0 }}>{copy.cartAndCheckout}</h1>
      <CartView payOnline={loaderData.payOnline} />
    </>
  );
}
