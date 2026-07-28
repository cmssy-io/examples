/** A translatable field: one string, or one per enabled language. */
export type LocalizedValue = string | Record<string, string>;

export interface LocalizedTextOptions {
  /** The language being rendered. */
  locale?: string;
  /** The workspace's default language, tried before any other. */
  defaultLocale?: string | null;
  fallback?: string;
}

/**
 * Reads a translatable field.
 *
 * A translatable field arrives resolved when the query carries a locale, but
 * the delivery API answers with the whole `{ en: "...", no: "..." }` map when
 * it does not - and page-level fields like `seoTitle` take no locale argument
 * at all. Casting one of those to `string` compiles and then renders
 * `[object Object]`, so read every one of them through here.
 */
export function localizedText(
  value: unknown,
  { locale, defaultLocale, fallback = "" }: LocalizedTextOptions = {},
): string {
  if (typeof value === "string") return value.trim() || fallback;

  // An array is not a language map. Without this check it would answer with
  // element 0, because indices are keys like any other.
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const map = value as Record<string, unknown>;

  // The site's default language before anything else, because "whichever one
  // it has" is settled by JSON key order - which puts a German title on a
  // Norwegian page, and swaps it for a French one when the API reorders the
  // map, with no content change.
  for (const key of [locale, defaultLocale]) {
    const entry = key ? map[key] : undefined;
    if (typeof entry === "string" && entry.trim()) return entry.trim();
  }

  // A partially translated page still reads better in some language than none.
  for (const entry of Object.values(map)) {
    if (typeof entry === "string" && entry.trim()) return entry.trim();
  }

  return fallback;
}
