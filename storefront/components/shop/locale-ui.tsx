"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { localePath, type ShopLocale } from "@/lib/locale-path";
import { copyFor, type ShopCopy } from "@/lib/shop-copy";

const LocaleContext = createContext<ShopLocale>({
  locale: "en",
  defaultLocale: "en",
  locales: ["en"],
});

export function LocaleProvider({
  value,
  children,
}: {
  value: ShopLocale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useShopLocale(): ShopLocale {
  const context = useContext(LocaleContext);
  const pathname = usePathname();
  const first = pathname.split("/").filter(Boolean)[0];
  const locale =
    first && first !== context.defaultLocale && context.locales.includes(first)
      ? first
      : context.defaultLocale;
  return { ...context, locale };
}

export function useShopCopy(): ShopCopy {
  return copyFor(useShopLocale().locale);
}

export function useLocalePath(): (path: string) => string {
  const { locale, defaultLocale } = useShopLocale();
  return (path: string) => localePath(path, locale, defaultLocale);
}

export function useShopPathname(): string {
  const { defaultLocale, locales } = useShopLocale();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && first !== defaultLocale && locales.includes(first)) {
    return `/${segments.slice(1).join("/")}`;
  }
  return pathname;
}
