import { AccountPanel } from "@/components/shop/account-panel";
import { AccountSettings } from "@/components/shop/account-settings";
import { OrderHistory } from "@/components/shop/order-history";
import { currentUser } from "@/lib/cmssy/session";
import { listMyOrders } from "@/services/orders";
import { getMyProfile } from "@/services/account";
import { shopLocale } from "@/lib/locale";
import { copyFor } from "@/lib/shop-copy";
import { payOnline } from "@/lib/stripe";
import { fetchBrand, pageTitle } from "@/services/site";

export async function generateMetadata() {
  const { locale } = await shopLocale();
  return { title: await pageTitle(copyFor(locale).tradeAccount) };
}

export default async function AccountPage() {
  const { locale } = await shopLocale();
  const copy = copyFor(locale);

  const [user, brand] = await Promise.all([currentUser(), fetchBrand()]);
  const [orders, profile] = user
    ? await Promise.all([
        listMyOrders().then((result) => result.items),
        getMyProfile(),
      ])
    : [[], null];

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{copy.tradeAccount}</h1>
      <AccountPanel brandName={brand.name} />
      {user ? <OrderHistory orders={orders} payOnline={payOnline()} /> : null}
      {profile ? <AccountSettings profile={profile} /> : null}
    </>
  );
}
