import { QuickOrder } from "../components/shop/quick-order";
import { ShopErrorBoundary } from "../components/shop/shop-error";
import { shopRouteLocale } from "../lib/locale";
import { copyFor } from "../lib/shop-copy";
import type { Route } from "./+types/quick-order";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { locale } = await shopRouteLocale(request, params);
  return { locale };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  return [{ title: `${copyFor(loaderData.locale).quickOrder} - MACHTEC` }];
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <ShopErrorBoundary error={error} />;
}

export default function QuickOrderPage({ loaderData }: Route.ComponentProps) {
  const copy = copyFor(loaderData.locale);
  return (
    <>
      <h1 style={{ marginTop: 0 }}>{copy.quickOrder}</h1>
      <p className="shop-muted">{copy.quickOrderIntro}</p>
      <QuickOrder />
    </>
  );
}
