import { AccountPanel } from "@/components/shop/account-panel";
import { AccountCompany } from "@/components/shop/account-company";
import { AccountSettings } from "@/components/shop/account-settings";
import { TradeChannels } from "@/components/shop/trade-channels";
import { OrderHistory } from "@/components/shop/order-history";
import { currentUser } from "@/lib/cmssy/session";
import { ORDERS_PAGE_SIZE, listMyOrders } from "@/services/orders";
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
  searchParams: Promise<{ orders?: string; page?: string }>;
}) {
  const { orders: requestedScope, page: requestedPage } = await searchParams;
  const page = Math.max(1, Number.parseInt(requestedPage ?? "", 10) || 1);
  const skip = (page - 1) * ORDERS_PAGE_SIZE;
  const { locale, defaultLocale } = await shopLocale();
  const copy = copyFor(locale);
  const href = (path: string) => localePath(path, locale, defaultLocale);

  const [user, brand] = await Promise.all([currentUser(), fetchBrand()]);
  const wantsCompany = requestedScope === "company";
  const [profile, ownOrders] = user
    ? await Promise.all([
        getMyProfile(),
        wantsCompany ? null : listMyOrders({ skip }),
      ])
    : [null, null];
  const scope = orderScopeFor(requestedScope, profile?.company);
  const orders = !user
    ? null
    : (ownOrders ?? (await listMyOrders({ scope, skip })));

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{copy.tradeAccount}</h1>
      <AccountPanel brandName={brand.name} />
      {profile ? <AccountCompany profile={profile} copy={copy} /> : null}
      {orders ? (
        <OrderHistory
          orders={orders.items}
          page={page}
          lastPage={Math.max(1, Math.ceil(orders.total / ORDERS_PAGE_SIZE))}
          payOnline={payOnline()}
          scope={canReadCompanyOrders(profile?.company) ? scope : undefined}
        />
      ) : null}
      {profile ? <AccountSettings profile={profile} /> : null}
      <TradeChannels copy={copy} href={href} />
    </>
  );
}
