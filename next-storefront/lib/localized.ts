/** A translatable field: one string, or one per enabled language. */
export type LocalizedValue = string | Record<string, string>;

export interface LocalizedTextOptions {
  /** The language being rendered. */
  locale?: string;
  /** The workspace's default language, tried after `locale` and before the rest. */
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

  // The language being rendered, then the site's default - both before
  // "whichever one it has", which is settled by JSON key order and so puts a
  // German title on a Norwegian page, then swaps it for a French one when the
  // API reorders the map, with no content change.
  const preferred = [locale, defaultLocale].filter(
    (key, index, all): key is string => Boolean(key) && all.indexOf(key) === index,
  );
  for (const key of preferred) {
    const entry = map[key];
    if (typeof entry === "string" && entry.trim()) return entry.trim();
  }

  // A partially translated page still reads better in some language than none.
  for (const entry of Object.values(map)) {
    if (typeof entry === "string" && entry.trim()) return entry.trim();
  }

  return fallback;
}
