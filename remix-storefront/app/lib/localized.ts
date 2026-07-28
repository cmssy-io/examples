import type { CmssyLocalizedValue } from "@cmssy/core";

export function pickLocalized(
  value: CmssyLocalizedValue | undefined,
  locale: string,
  defaultLocale: string,
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] ?? value[defaultLocale] ?? Object.values(value)[0] ?? "";
}
