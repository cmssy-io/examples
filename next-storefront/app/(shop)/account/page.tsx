import { AccountPanel } from "@/components/shop/account-panel";
import { OrderHistory } from "@/components/shop/order-history";
import { currentUser } from "@/lib/cmssy/session";
import { listMyOrders } from "@/services/orders";
import { shopLocale } from "@/lib/locale";
import { copyFor } from "@/lib/shop-copy";

export async function generateMetadata() {
  const { locale } = await shopLocale();
  return { title: `${copyFor(locale).tradeAccount} - MACHTEC` };
}

export default async function AccountPage() {
  const { locale } = await shopLocale();
  const copy = copyFor(locale);

  const user = await currentUser();
  const orders = user ? (await listMyOrders()).items : [];

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{copy.tradeAccount}</h1>
      <AccountPanel />
      {user ? <OrderHistory orders={orders} /> : null}
    </>
  );
}
