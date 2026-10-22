import { AccountPanel } from "@/components/shop/account-panel";
import { AccountCompany } from "@/components/shop/account-company";
import { AccountSettings } from "@/components/shop/account-settings";
import { TradeChannels } from "@/components/shop/trade-channels";
import { OrderHistory } from "@/components/shop/order-history";
import { currentUser } from "@/lib/cmssy/session";
import { listMyOrders } from "@/services/orders";
import { getMyProfile } from "@/services/account";
import { canReadCompanyOrders, orderScopeFor } from "@/lib/company-role";
import { localePath, shopLocale } from "@/lib/locale";
import { copyFor } from "@/lib/shop-copy";
import { payOnline } from "@/lib/stripe";
import { fetchBrand, pageTitle } from "@/services/site";

export async function generateMetadata() {
  const { locale } = await shopLocale();
  return { title: await pageTitle(copyFor(locale).tradeAccount) };
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ orders?: string }>;
}) {
  const { orders: requestedScope } = await searchParams;
  const { locale, defaultLocale } = await shopLocale();
  const copy = copyFor(locale);
  const href = (path: string) => localePath(path, locale, defaultLocale);

  const [user, brand] = await Promise.all([currentUser(), fetchBrand()]);
  const wantsCompany = requestedScope === "company";
  const [profile, ownOrders] = user
    ? await Promise.all([getMyProfile(), wantsCompany ? null : listMyOrders()])
    : [null, null];
  const scope = orderScopeFor(requestedScope, profile?.company);
  const orders = !user
    ? []
    : (ownOrders ?? (await listMyOrders({ scope }))).items;

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{copy.tradeAccount}</h1>
      <AccountPanel brandName={brand.name} />
      {profile ? <AccountCompany profile={profile} copy={copy} /> : null}
      {user ? (
        <OrderHistory
          orders={orders}
          payOnline={payOnline()}
          scope={canReadCompanyOrders(profile?.company) ? scope : undefined}
        />
      ) : null}
      {profile ? <AccountSettings profile={profile} /> : null}
      <TradeChannels copy={copy} href={href} />
    </>
  );
}
