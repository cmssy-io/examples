import { CMSSY_LOCALE_HEADER } from "@cmssy/astro";
import type { ShopLocale } from "../lib/locale-path";
import { resolveSiteLocales } from "../services/site";

export async function shopLocale(request: Request): Promise<ShopLocale> {
  const siteLocales = await resolveSiteLocales();
  const requested = request.headers.get(CMSSY_LOCALE_HEADER);
  const locale =
    requested && siteLocales.locales.includes(requested)
      ? requested
      : siteLocales.defaultLocale;
  return { ...siteLocales, locale };
}
