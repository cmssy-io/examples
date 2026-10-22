import { CartView } from "@/components/shop/cart-view";
import { shopLocale } from "@/lib/locale";
import { countryOptions } from "@/lib/shipping-countries";
import { payOnline } from "@/lib/stripe";
import { copyFor } from "@/lib/shop-copy";
import { fetchShopSettings, pageTitle } from "@/services/site";
import { getCart } from "@/services/cart";
import { loadCartPriceBadges } from "@/services/prices";
import { readCartToken } from "@/lib/cmssy/cart-cookie";
import { memberAccessToken } from "@/lib/cmssy/member-token";

export async function generateMetadata() {
  const { locale } = await shopLocale();
  return { title: await pageTitle(copyFor(locale).cart) };
}

async function cartPriceBadges() {
  const [cartToken, accessToken] = await Promise.all([
    readCartToken(),
    memberAccessToken(),
  ]);
  if (!cartToken && !accessToken) return {};
  const cart = await getCart().catch(() => null);
  if (!cart || cart.items.length === 0) return {};
  return loadCartPriceBadges(cart.items.map((item) => item.recordId));
}

export default async function CartPage() {
  const { locale } = await shopLocale();
  const copy = copyFor(locale);
  const [{ orderFields, shippingCountries }, priceBadges] = await Promise.all([
    fetchShopSettings(),
    cartPriceBadges(),
  ]);

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{copy.cartAndCheckout}</h1>
      <CartView
        payOnline={payOnline()}
        orderFields={orderFields}
        priceBadges={priceBadges}
        countries={
          shippingCountries ? countryOptions(shippingCountries, locale) : null
        }
      />
    </>
  );
}
