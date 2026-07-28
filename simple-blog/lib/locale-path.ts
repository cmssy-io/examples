// Locale helpers. cmssy encodes the language as a path prefix and the default
// language has none, so /about is the default and /pl/about is Polish. The SDK
// ships no locale helper - the rules are the CMS's, the code is yours.

export interface SiteLocales {
  defaultLocale: string;
  locales: string[];
}

/**
 * Split a routed path into its locale and the rest. A first segment counts as
 * a locale only when it is enabled AND is not the default, so /en/about is a
 * page whose slug starts with "en", not the English about page.
 */
export function splitLocaleFromPath(
  path: string[] | undefined,
  locales: SiteLocales,
): { locale: string; path: string[] } {
  const segments = path ?? [];
  const first = segments[0];
  if (
    first &&
    first !== locales.defaultLocale &&
    locales.locales.includes(first)
  ) {
    return { locale: first, path: segments.slice(1) };
  }
  return { locale: locales.defaultLocale, path: segments };
}

/** The reverse: a slug plus a locale becomes a URL path. */
export function localizedPath(
  slug: string,
  locale: string,
  defaultLocale: string,
): string {
  const normalized = slug.startsWith("/") ? slug : `/${slug}`;
  const base = normalized === "/" ? "" : normalized;
  return locale === defaultLocale ? base || "/" : `/${locale}${base}`;
}

/**
 * Resolve a language-keyed value: the requested language, then the default,
 * then whatever exists. A bare string is legacy content and still valid.
 */
export function pickLocalized(
  value: Record<string, string> | string | null | undefined,
  locale: string,
  defaultLocale: string,
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] ?? value[defaultLocale] ?? Object.values(value)[0] ?? "";
}
