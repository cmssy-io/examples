import { headers } from "next/headers";
import { CMSSY_LOCALE_HEADER, type ShopLocale } from "./locale-path";
import { resolveSiteLocales } from "@/services/site";

export { localePath, type ShopLocale } from "./locale-path";

export async function shopLocale(): Promise<ShopLocale> {
  const { defaultLocale, locales } = await resolveSiteLocales();
  const fromHeader = (await headers()).get(CMSSY_LOCALE_HEADER);
  return {
    locale: fromHeader || defaultLocale,
    defaultLocale,
    locales,
  };
}
