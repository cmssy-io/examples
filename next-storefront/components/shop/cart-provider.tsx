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
  setShippingAddressAction,
  updateItemAction,
  type CartResult,
} from "@/lib/actions/cart";
import {
  actionErrorMessage,
  reloadIfStaleDeployment,
} from "@/lib/action-errors";
import type { CartReview } from "@/lib/cart-errors";
import { selectionKey } from "@/lib/variants";

type CartAction =
  | {
      type: "add";
      recordId: string;
      quantity: number;
      variantSelections?: Record<string, string>;
    }
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
      const key = selectionKey(action.variantSelections);
      const sameLine = (item: CartItem) =>
        item.recordId === action.recordId &&
        selectionKey(item.variantSelections) === key;
      const has = cart.items.some(sameLine);
      const items = has
        ? cart.items.map((item) =>
            sameLine(item)
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
  itemCount: number;
  loading: boolean;
  error: string | null;
  /** The channel refused the last cart write until the visitor signs in. */
  signInRequired: boolean;
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
  setShippingAddress(shippingAddress: ShippingAddressInput): Promise<boolean>;
  merge(): Promise<boolean>;
  checkout(input: CheckoutInput): Promise<CheckoutOutcome>;
  refresh(): Promise<void>;
}

export interface CheckoutInput {
  customerEmail: string;
  poNumber: string | null;
  customerNote: string | null;
  customFields: Record<string, unknown> | null;
  shippingAddress: ShippingAddressInput | null;
  expectedTotal: number;
}

export interface CheckoutOutcome {
  order: CheckoutOrder;
  paymentUrl: string | null;
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
  const [pendingAdds, addPending] = useOptimistic(
    0,
    (count: number, quantity: number) => count + quantity,
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [signInRequired, setSignInRequired] = useState(false);

  const value = useMemo<CartContextValue>(() => {
    const run = (
      optimistic: CartAction | null,
      action: () => Promise<CartResult>,
    ): Promise<boolean> => {
      let settle: (accepted: boolean) => void = () => {};
      const done = new Promise<boolean>((resolve) => {
        settle = resolve;
      });
      startTransition(async () => {
        if (optimistic) applyOptimistic(optimistic);
        if (optimistic?.type === "add") addPending(optimistic.quantity);
        try {
          const result = await action();
          if ("error" in result) {
            if (result.leaveChannel) window.location.reload();
            setError(result.error);
            setSignInRequired(Boolean(result.signIn));
            settle(false);
          } else {
            startTransition(() => setCart(result.cart));
            setError(null);
            setSignInRequired(false);
            settle(true);
          }
        } catch (err) {
          if (!reloadIfStaleDeployment(err)) {
            setError(actionErrorMessage(err, "Commerce request failed"));
          }
          settle(false);
        }
      });
      return done;
    };

    const refresh = async () => {
      try {
        setCart(await getCartAction());
      } catch (err) {
        if (!reloadIfStaleDeployment(err)) {
          setError(actionErrorMessage(err, "Commerce request failed"));
        }
      }
    };

    const review = async (
      reason: CartReview,
      shippingAddress: ShippingAddressInput | null,
    ) => {
      if (reason === "TAX_TREATMENT_CHANGED" && shippingAddress) {
        const resent = await setShippingAddressAction(shippingAddress).catch(
          () => null,
        );
        if (resent && "cart" in resent) setCart(resent.cart);
      }
      await refresh();
    };

    return {
      cart: optimisticCart,
      itemCount: optimisticCart ? optimisticCart.itemCount : pendingAdds,
      loading: isPending,
      error,
      signInRequired,
      addToCart: (recordId, quantity = 1, options) =>
        run(
          {
            type: "add",
            recordId,
            quantity,
            variantSelections: options?.variantSelections,
          },
          () =>
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
      setShippingAddress: (shippingAddress) =>
        run(null, () => setShippingAddressAction(shippingAddress)),
      merge: () => run(null, () => mergeCartAction()),
      checkout: async (input) => {
        let result: Awaited<ReturnType<typeof checkoutAction>>;
        try {
          result = await checkoutAction(input);
        } catch (err) {
          throw new Error(actionErrorMessage(err, "Checkout failed"));
        }
        if ("error" in result) {
          if (result.leaveChannel) window.location.reload();
          setSignInRequired(Boolean(result.signIn));
          if (result.review) await review(result.review, input.shippingAddress);
          throw new Error(result.error);
        }
        setCart(null);
        return result;
      },
      refresh,
    };
  }, [
    optimisticCart,
    pendingAdds,
    isPending,
    error,
    signInRequired,
    applyOptimistic,
    addPending,
    startTransition,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
