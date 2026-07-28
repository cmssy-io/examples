"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const TOAST_MS = 5000;

interface CartUi {
  drawerOpen: boolean;
  toastName: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  announceAdded: (name: string) => void;
  dismissToast: () => void;
}

const CartUiContext = createContext<CartUi | null>(null);

export function CartUiProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toastName, setToastName] = useState<string | null>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const dismissToast = useCallback(() => setToastName(null), []);

  const announceAdded = useCallback((name: string) => {
    setToastName(name);
    setDrawerOpen(true);
  }, []);

  useEffect(() => {
    if (!toastName) return;
    const timer = setTimeout(() => setToastName(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toastName]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const value = useMemo(
    () => ({
      drawerOpen,
      toastName,
      openDrawer,
      closeDrawer,
      announceAdded,
      dismissToast,
    }),
    [
      drawerOpen,
      toastName,
      openDrawer,
      closeDrawer,
      announceAdded,
      dismissToast,
    ],
  );

  return (
    <CartUiContext.Provider value={value}>{children}</CartUiContext.Provider>
  );
}

export function useCartUi() {
  const context = useContext(CartUiContext);
  if (!context) {
    throw new Error("useCartUi must be used inside CartUiProvider");
  }
  return context;
}
