import { createContext, useContext, type ReactNode } from "react";
import { useLocation } from "react-router";
import {
  localeFromPathname,
  localePath,
  stripLocalePrefix,
  type ShopLocale,
} from "../../lib/locale-path";
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
