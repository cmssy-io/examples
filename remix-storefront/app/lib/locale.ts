import { data } from "react-router";
import { resolveSiteLocales } from "../services/site";
import {
  isLocalePrefix,
  localeFromPathname,
  type ShopLocale,
} from "./locale-path";

export type { ShopLocale } from "./locale-path";

export async function shopLocale(request: Request): Promise<ShopLocale> {
  const siteLocales = await resolveSiteLocales();
  return {
    locale: localeFromPathname(new URL(request.url).pathname, siteLocales),
    ...siteLocales,
  };
}

export async function shopRouteLocale(
  request: Request,
  params: { locale?: string },
): Promise<ShopLocale> {
  const resolved = await shopLocale(request);
  if (params.locale !== undefined && !isLocalePrefix(params.locale, resolved)) {
    throw data(null, { status: 404 });
  }
  return resolved;
}
