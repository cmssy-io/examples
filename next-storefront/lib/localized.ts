/** A translatable field: one string, or one per enabled language. */
export type LocalizedValue = string | Record<string, string>;

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
  { locale, fallback = "" }: { locale?: string; fallback?: string } = {},
): string {
  if (typeof value === "string") return value.trim() || fallback;

  if (value && typeof value === "object") {
    const map = value as Record<string, unknown>;
    const preferred = locale ? map[locale] : undefined;
    if (typeof preferred === "string" && preferred.trim()) return preferred;

    // No entry for this locale: a partially translated page still reads better
    // in the wrong language than not at all.
    for (const entry of Object.values(map)) {
      if (typeof entry === "string" && entry.trim()) return entry;
    }
  }

  return fallback;
}
