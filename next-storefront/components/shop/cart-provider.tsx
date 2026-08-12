"use client";

import {
  createContext,
  useContext,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import type { ShippingAddressInput } from "@/graphql/generated/graphql";
import type { Cart, CartItem, CheckoutOrder } from "@/graphql/types";
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
  type CartResult,
} from "@/lib/actions/cart";
import {
  actionErrorMessage,
  handledStaleDeployment,
} from "@/lib/action-errors";

type CartAction =
  | { type: "add"; recordId: string; quantity: number }
  | { type: "update"; itemId: string; quantity: number }
  | { type: "remove"; itemId: string }
  | { type: "clear" };

function countItems(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

function cartReducer(
  cart: Cart | null,
  action: CartAction,
): Cart | null {
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
  notes?: string;
}

export interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  addToCart(
    recordId: string,
    quantity?: number,
    options?: AddToCartOptions,
  ): Promise<void>;
  updateItem(itemId: string, quantity: number): Promise<void>;
  removeItem(itemId: string): Promise<void>;
  clearCart(): Promise<void>;
  applyDiscount(code: string): Promise<void>;
  removeDiscount(): Promise<void>;
  setShippingMethod(shippingMethodId: string | null): Promise<void>;
  merge(): Promise<void>;
  checkout(input: CheckoutInput): Promise<CheckoutOrder>;
  refresh(): Promise<void>;
}

export interface CheckoutInput {
  customerEmail: string;
  poNumber: string | null;
  customerNote: string | null;
  shippingAddress: ShippingAddressInput | null;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  initialCart,
}: {
  children: ReactNode;
  initialCart: Cart | null;
}) {
  const [cart, setCart] = useState(initialCart);
  const [optimisticCart, applyOptimistic] = useOptimistic(cart, cartReducer);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const value = useMemo<CartContextValue>(() => {
    const run = (
      optimistic: CartAction | null,
      action: () => Promise<CartResult>,
    ): Promise<void> => {
      let settle: () => void = () => {};
      const done = new Promise<void>((resolve) => {
        settle = resolve;
      });
      startTransition(async () => {
        if (optimistic) applyOptimistic(optimistic);
        try {
          const result = await action();
          if ("error" in result) setError(result.error);
          else {
            setCart(result.cart);
            setError(null);
          }
        } catch (err) {
          // The actions return their own failures, so a throw here is the call
          // itself failing - a retired build, a dropped connection. Swallowing
          // it keeps `done` from hanging; React discards the optimistic item
          // when the transition ends, so the cart snaps back to server state.
          if (!handledStaleDeployment(err)) {
            setError(actionErrorMessage(err, "Commerce request failed"));
          }
        } finally {
          settle();
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
      clearCart: () => run({ type: "clear" }, () => clearCartAction()),
      applyDiscount: (code) => run(null, () => applyDiscountAction(code)),
      removeDiscount: () => run(null, () => removeDiscountAction()),
      setShippingMethod: (shippingMethodId) =>
        run(null, () => setShippingAction(shippingMethodId)),
      merge: () => run(null, () => mergeCartAction()),
      checkout: async (input) => {
        // No reload on a retired build here: checkout carries a filled-in form
        // and the order never reached the server, so the message asks for the
        // refresh instead of wiping what the customer typed.
        let result: Awaited<ReturnType<typeof checkoutAction>>;
        try {
          result = await checkoutAction(input);
        } catch (err) {
          throw new Error(actionErrorMessage(err, "Checkout failed"));
        }
        if ("error" in result) throw new Error(result.error);
        setCart(null);
        return result.order;
      },
      refresh: async () => {
        try {
          setCart(await getCartAction());
        } catch (err) {
          if (!handledStaleDeployment(err)) {
            setError(actionErrorMessage(err, "Commerce request failed"));
          }
        }
      },
    };
  }, [optimisticCart, isPending, error, applyOptimistic, startTransition]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
