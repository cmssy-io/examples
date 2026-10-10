import { useStore } from "@nanostores/react";
import { atom } from "nanostores";

export const TOAST_MS = 5000;

export const $drawerOpen = atom(false);
export const $toastName = atom<string | null>(null);

export function openDrawer(): void {
  $drawerOpen.set(true);
}

export function closeDrawer(): void {
  $drawerOpen.set(false);
}

export function dismissToast(): void {
  $toastName.set(null);
}

export function announceAdded(name: string): void {
  $toastName.set(name);
  $drawerOpen.set(true);
}

export function useCartUi() {
  const drawerOpen = useStore($drawerOpen);
  const toastName = useStore($toastName);
  return {
    drawerOpen,
    toastName,
    openDrawer,
    closeDrawer,
    announceAdded,
    dismissToast,
  };
}
