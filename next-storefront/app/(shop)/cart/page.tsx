import { CartView } from "@/components/shop/cart-view";
import { shopLocale } from "@/lib/locale";
import { payOnline } from "@/lib/stripe";
import { copyFor } from "@/lib/shop-copy";
import { fetchShopSettings } from "@/services/site";

export async function generateMetadata() {
  const { locale } = await shopLocale();
  return { title: `${copyFor(locale).cart} - MACHTEC` };
}

export default async function CartPage() {
  const { locale } = await shopLocale();
  const copy = copyFor(locale);
  const { orderFields } = await fetchShopSettings();

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{copy.cartAndCheckout}</h1>
      <CartView payOnline={payOnline()} orderFields={orderFields} />
    </>
  );
}
