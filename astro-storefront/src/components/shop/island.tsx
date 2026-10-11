import type { ComponentType, ReactNode } from "react";
import type { Cart } from "../../graphql/types";
import { CartSeedContext } from "./cart-store";
import { LocaleProvider, type ShopLocation } from "./locale-ui";

export interface ShopState {
  location: ShopLocation;
  cart: Cart | null;
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
      <CartSeedContext.Provider value={state.cart}>
        {children}
      </CartSeedContext.Provider>
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
