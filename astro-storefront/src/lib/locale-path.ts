export interface SiteLocales {
  defaultLocale: string;
  locales: string[];
}

export function localizedPath(
  slug: string,
  locale: string,
  defaultLocale: string,
): string {
  const normalized = slug.startsWith("/") ? slug : `/${slug}`;
  const base = normalized === "/" ? "" : normalized;
  return locale === defaultLocale ? base || "/" : `/${locale}${base}`;
}

export function pickLocalized(
  value: Record<string, string> | string | null | undefined,
  locale: string,
  defaultLocale: string,
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] ?? value[defaultLocale] ?? Object.values(value)[0] ?? "";
}
