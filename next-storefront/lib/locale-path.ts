export interface ShopLocale {
  locale: string;
  defaultLocale: string;
  locales: string[];
}

export interface SiteLocales {
  defaultLocale: string;
  locales: string[];
}

export const CMSSY_LOCALE_HEADER = "x-cmssy-locale";

export function localeFromPathname(
  pathname: string,
  { defaultLocale, locales }: SiteLocales,
): string {
  const first = pathname.split("/").filter(Boolean)[0];
  if (first && first !== defaultLocale && locales.includes(first)) return first;
  return defaultLocale;
}

export function localePath(
  path: string,
  locale: string,
  defaultLocale: string,
): string {
  if (locale === defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
