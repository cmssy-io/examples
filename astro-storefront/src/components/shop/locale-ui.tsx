import { createContext, useContext, type ReactNode } from "react";
import {
  localePath,
  stripLocalePrefix,
  type ShopLocale,
} from "../../lib/locale-path";
import { formatMoney } from "../../lib/money";
import { copyFor, type ShopCopy } from "../../lib/shop-copy";

export interface ShopLocation extends ShopLocale {
  pathname: string;
  search: string;
  currency: string | null;
}

const LocationContext = createContext<ShopLocation | null>(null);

export function LocaleProvider({
  value,
  children,
}: {
  value: ShopLocation;
  children: ReactNode;
}) {
  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useShopLocation(): ShopLocation {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useShopLocation must be used within a LocaleProvider");
  }
  return context;
}

export function useShopLocale(): ShopLocale {
  const { locale, defaultLocale, locales } = useShopLocation();
  return { locale, defaultLocale, locales };
}

export function useMoney(currency?: string | null): (minor: number) => string {
  const location = useShopLocation();
  const shown = currency ?? location.currency;
  return (minor: number) => formatMoney(minor, shown, location.locale);
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
  const location = useShopLocation();
  return stripLocalePrefix(location.pathname, location);
}

export function useShopSearch(): URLSearchParams {
  return new URLSearchParams(useShopLocation().search);
}
