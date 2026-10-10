export interface ShopLocale {
  locale: string;
  defaultLocale: string;
  locales: string[];
}

export interface SiteLocales {
  defaultLocale: string;
  locales: string[];
}

export function isLocalePrefix(
  segment: string | undefined,
  { defaultLocale, locales }: SiteLocales,
): segment is string {
  return Boolean(
    segment && segment !== defaultLocale && locales.includes(segment),
  );
}

export function localeFromPathname(
  pathname: string,
  siteLocales: SiteLocales,
): string {
  const first = pathname.split("/").filter(Boolean)[0];
  return isLocalePrefix(first, siteLocales) ? first : siteLocales.defaultLocale;
}

export function stripLocalePrefix(
  pathname: string,
  siteLocales: SiteLocales,
): string {
  const segments = pathname.split("/").filter(Boolean);
  if (isLocalePrefix(segments[0], siteLocales)) {
    return `/${segments.slice(1).join("/")}`;
  }
  return pathname;
}

export function localePath(
  path: string,
  locale: string,
  defaultLocale: string,
): string {
  if (locale === defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
