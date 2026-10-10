import type { ComponentType, ReactNode } from "react";
import type { Cart } from "../../graphql/types";
import type { SessionUser } from "../../lib/cmssy/session-crypto";
import { CartSeedContext } from "./cart-store";
import { LocaleProvider, type ShopLocation } from "./locale-ui";
import { UserProvider } from "./user-provider";

export interface ShopState {
  location: ShopLocation;
  user: SessionUser | null;
  cart: Cart | null;
  payOnline: boolean;
}

export function ShopIsland({
  state,
  children,
}: {
  state: ShopState;
  children: ReactNode;
}) {
  return (
    <LocaleProvider value={state.location}>
      <UserProvider initialUser={state.user}>
        <CartSeedContext.Provider value={state.cart}>
          {children}
        </CartSeedContext.Provider>
      </UserProvider>
    </LocaleProvider>
  );
}

export type IslandProps<P> = P & { shop: ShopState };

export function shopIsland<P extends object>(Component: ComponentType<P>) {
  return function Island({ shop, ...props }: IslandProps<P>) {
    return (
      <ShopIsland state={shop}>
        <Component {...(props as P)} />
      </ShopIsland>
    );
  };
}
