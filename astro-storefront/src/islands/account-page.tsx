import { AccountPanel } from "../components/shop/account-panel";
import { shopIsland } from "../components/shop/island";
import { OrderHistory } from "../components/shop/order-history";
import { useCmssyUser } from "../components/shop/user-provider";
import type { Order } from "../graphql/types";

function AccountPage({
  orders,
  payOnline,
}: {
  orders: Order[];
  payOnline: boolean;
}) {
  const { user } = useCmssyUser();
  return (
    <>
      <AccountPanel />
      {user ? <OrderHistory orders={orders} payOnline={payOnline} /> : null}
    </>
  );
}

export const AccountPageIsland = shopIsland(AccountPage);
