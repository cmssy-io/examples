import { createContext, useContext, type ReactNode } from "react";
import { useLocation } from "react-router";
import {
  localeFromPathname,
  localePath,
  stripLocalePrefix,
  type ShopLocale,
} from "../../lib/locale-path";
import { formatMoney } from "../../lib/money";
import { copyFor, type ShopCopy } from "../../lib/shop-copy";

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
  const { pathname } = useLocation();
  return { ...context, locale: localeFromPathname(pathname, context) };
}

const CurrencyContext = createContext<string | null | undefined>(undefined);

export function CurrencyProvider({
  currency,
  children,
}: {
  currency: string | null;
  children: ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={currency}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useShopCurrency(): string | null {
  const currency = useContext(CurrencyContext);
  if (currency === undefined) {
    throw new Error("useShopCurrency needs a CurrencyProvider above it");
  }
  return currency;
}

export function useMoney(currency?: string | null): (minor: number) => string {
  const { locale } = useShopLocale();
  const shopCurrency = useShopCurrency();
  const shown = currency ?? shopCurrency;
  return (minor: number) => formatMoney(minor, shown, locale);
}

export function useShopCopy(): ShopCopy {
  return copyFor(useShopLocale().locale);
}

export function useLocalePath(): (path: string) => string {
  const siteLocales = useShopLocale();
  return (path: string) =>
    localePath(
      stripLocalePrefix(path, siteLocales),
      siteLocales.locale,
      siteLocales.defaultLocale,
    );
}

export function useShopPathname(): string {
  const siteLocales = useShopLocale();
  const { pathname } = useLocation();
  return stripLocalePrefix(pathname, siteLocales);
}
