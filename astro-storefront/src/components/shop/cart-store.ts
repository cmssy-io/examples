import { useStore } from "@nanostores/react";
import { atom } from "nanostores";
import {
  createContext,
  useContext,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import type { Cart, CartItem } from "../../graphql/types";
import { actionErrorMessage } from "../../lib/action-errors";
import {
  addItemAction,
  applyDiscountAction,
  checkoutAction,
  clearCartAction,
  getCartAction,
  mergeCartAction,
  removeDiscountAction,
  removeItemAction,
  setShippingAction,
  updateItemAction,
  type CheckoutInput,
  type CheckoutOutcome,
} from "../../lib/actions/cart";
import { useShopLocale } from "./locale-ui";

export type { CheckoutInput, CheckoutOutcome } from "../../lib/actions/cart";

export const $cart = atom<Cart | null | undefined>(undefined);

export const CartSeedContext = createContext<Cart | null>(null);

type CartAction =
  | { type: "add"; recordId: string; quantity: number }
  | { type: "update"; itemId: string; quantity: number }
  | { type: "remove"; itemId: string }
  | { type: "clear" };

function countItems(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

function cartReducer(cart: Cart | null, action: CartAction): Cart | null {
  if (!cart) return cart;
  switch (action.type) {
    case "add": {
      const has = cart.items.some((item) => item.recordId === action.recordId);
      const items = has
        ? cart.items.map((item) =>
            item.recordId === action.recordId
              ? { ...item, quantity: item.quantity + action.quantity }
              : item,
          )
        : cart.items;
      return { ...cart, items, itemCount: cart.itemCount + action.quantity };
    }
    case "update": {
      const items = cart.items
        .map((item) =>
          item.id === action.itemId
            ? { ...item, quantity: action.quantity }
            : item,
        )
        .filter((item) => item.quantity > 0);
      return { ...cart, items, itemCount: countItems(items) };
    }
    case "remove": {
      const items = cart.items.filter((item) => item.id !== action.itemId);
      return { ...cart, items, itemCount: countItems(items) };
    }
    case "clear":
      return { ...cart, items: [], itemCount: 0 };
  }
}

export interface AddToCartOptions {
  variantSelections?: Record<string, string>;
}

export interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  addToCart(
    recordId: string,
    quantity?: number,
    options?: AddToCartOptions,
  ): Promise<boolean>;
  updateItem(itemId: string, quantity: number): Promise<boolean>;
  removeItem(itemId: string): Promise<boolean>;
  clearCart(): Promise<boolean>;
  applyDiscount(code: string): Promise<boolean>;
  removeDiscount(): Promise<boolean>;
  setShippingMethod(shippingMethodId: string | null): Promise<boolean>;
  merge(): Promise<boolean>;
  checkout(input: CheckoutInput): Promise<CheckoutOutcome>;
  refresh(): Promise<void>;
}

export function useCart(): CartContextValue {
  const { locale } = useShopLocale();
  const seed = useContext(CartSeedContext);
  const stored = useStore($cart);
  const cart = stored === undefined ? seed : stored;
  const [optimisticCart, applyOptimistic] = useOptimistic(cart, cartReducer);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return useMemo<CartContextValue>(() => {
    const run = (
      optimistic: CartAction | null,
      action: () => Promise<Cart>,
    ): Promise<boolean> => {
      let settle: (accepted: boolean) => void = () => {};
      const done = new Promise<boolean>((resolve) => {
        settle = resolve;
      });
      startTransition(async () => {
        if (optimistic) applyOptimistic(optimistic);
        try {
          $cart.set(await action());
          setError(null);
          settle(true);
        } catch (err) {
          setError(actionErrorMessage(err, "Commerce request failed"));
          settle(false);
        }
      });
      return done;
    };

    return {
      cart: optimisticCart,
      loading: isPending,
      error,
      addToCart: (recordId, quantity = 1, options) =>
        run({ type: "add", recordId, quantity }, () =>
          addItemAction({
            recordId,
            quantity,
            variantSelections: options?.variantSelections,
          }),
        ),
      updateItem: (itemId, quantity) =>
        run({ type: "update", itemId, quantity }, () =>
          updateItemAction({ itemId, quantity }),
        ),
      removeItem: (itemId) =>
        run({ type: "remove", itemId }, () => removeItemAction(itemId)),
      clearCart: () => run({ type: "clear" }, clearCartAction),
      applyDiscount: (code) => run(null, () => applyDiscountAction(code)),
      removeDiscount: () => run(null, removeDiscountAction),
      setShippingMethod: (shippingMethodId) =>
        run(null, () => setShippingAction(shippingMethodId)),
      merge: () => run(null, mergeCartAction),
      checkout: async (input) => {
        let outcome: CheckoutOutcome;
        try {
          outcome = await checkoutAction(input, locale);
        } catch (err) {
          throw new Error(actionErrorMessage(err, "Checkout failed"));
        }
        $cart.set(null);
        return outcome;
      },
      refresh: async () => {
        try {
          $cart.set(await getCartAction());
        } catch (err) {
          setError(actionErrorMessage(err, "Commerce request failed"));
        }
      },
    };
  }, [optimisticCart, isPending, error, applyOptimistic, startTransition, locale]);
}
