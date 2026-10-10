export type LocalizedValue = string | Record<string, string>;

export interface LocalizedTextOptions {
  locale?: string;
  defaultLocale?: string | null;
  fallback?: string;
}

export function localizedText(
  value: unknown,
  { locale, defaultLocale, fallback = "" }: LocalizedTextOptions = {},
): string {
  if (typeof value === "string") return value.trim() || fallback;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const map = value as Record<string, unknown>;

  const preferred = [locale, defaultLocale].filter(
    (key, index, all): key is string =>
      Boolean(key) && all.indexOf(key) === index,
  );
  for (const key of preferred) {
    const entry = map[key];
    if (typeof entry === "string" && entry.trim()) return entry.trim();
  }

  for (const entry of Object.values(map)) {
    if (typeof entry === "string" && entry.trim()) return entry.trim();
  }

  return fallback;
}
