import { cmssy } from "@/cmssy.config";
import {
  ProductRolesDocument,
  PublicSiteConfigDocument,
  ShopSettingsDocument,
} from "@/graphql/generated/graphql";
import { publicRequest, scopedRequest } from "@/services/gateway";
import { ttlCache } from "@/lib/ttl-cache";
import type { SiteLocales } from "@/lib/locale-path";
import type { LocalizedValue } from "@/lib/localized";

export interface SiteConfig {
  /** Translatable, and this cache holds no locale - resolve it at the caller. */
  siteName: LocalizedValue | null;
  defaultLanguage: string | null;
  enabledLanguages: string[] | null;
  notFoundPageId: string | null;
  branding: { ogImageUrl: string | null } | null;
}

// The promise, not the value. Two callers in one `Promise.all` - which is how
// page metadata asks for the site name and the locale at the same time - both
// find an unresolved cache and both send the request.
//
// One consequence a value cache did not have: the rejected promise is shared,
// so a caller that holds it without awaiting in the same tick gets an
// unhandled-rejection warning. Await what this returns.
let cached: Promise<SiteConfig | null> | undefined;

export function fetchSiteConfig(): Promise<SiteConfig | null> {
  cached ??= loadSiteConfig().catch((error: unknown) => {
    // Caching the value could not outlive a failure; caching the promise can.
    // Clear it, or one bad response is the site config until the next deploy.
    cached = undefined;
    throw error;
  });
  return cached;
}

async function loadSiteConfig(): Promise<SiteConfig | null> {
  const data = await publicRequest(PublicSiteConfigDocument, {
    workspaceSlug: cmssy.workspaceSlug,
  });
  const config = data.public?.siteConfig ?? null;
  if (!config) return null;
  return {
    siteName: (config.siteName as LocalizedValue | null) ?? null,
    defaultLanguage: config.defaultLanguage,
    enabledLanguages: config.enabledLanguages,
    notFoundPageId: config.notFoundPageId,
    branding: config.branding,
  };
}

export async function resolveSiteLocales(): Promise<SiteLocales> {
  const config = await fetchSiteConfig();
  const defaultLocale = config?.defaultLanguage || "en";
  const enabled = config?.enabledLanguages ?? [];
  return {
    defaultLocale,
    locales: enabled.length > 0 ? enabled : [defaultLocale],
  };
}

export interface SiteTaxRates {
  defaultTaxRateId: string | null;
  rates: Map<string, number>;
}

export interface ShopSettings {
  tax: SiteTaxRates | null;
  lowStockThreshold: number | null;
}

const shopSettingsCache = ttlCache<ShopSettings>(60_000);

export function fetchShopSettings(): Promise<ShopSettings> {
  return shopSettingsCache("shop-settings", loadShopSettings);
}

async function loadShopSettings(): Promise<ShopSettings> {
  const data = await publicRequest(ShopSettingsDocument, {
    workspaceSlug: cmssy.workspaceSlug,
  });
  const config = data.public?.siteConfig;
  if (!config) return { tax: null, lowStockThreshold: null };
  const cart = config.publicCart ?? null;
  return {
    tax: cart
      ? {
          defaultTaxRateId: cart.defaultTaxRateId ?? null,
          rates: new Map(cart.taxRates.map((rate) => [rate.id, rate.rate])),
        }
      : null,
    lowStockThreshold: config.lowStockThreshold,
  };
}

export interface ProductRoles {
  taxRate: string;
}

let cachedRoles: Promise<Map<string, ProductRoles>> | undefined;

export function fetchProductRoles(
  modelSlug: string,
): Promise<ProductRoles | null> {
  cachedRoles ??= loadProductRoles().catch((error: unknown) => {
    cachedRoles = undefined;
    throw error;
  });
  return cachedRoles.then((roles) => roles.get(modelSlug) ?? null);
}

async function loadProductRoles(): Promise<Map<string, ProductRoles>> {
  const data = await scopedRequest(ProductRolesDocument, {});
  const definitions = data?.public?.model?.definitions ?? [];
  return new Map(
    definitions.flatMap((definition) =>
      definition.productRoles
        ? [[definition.slug, { taxRate: definition.productRoles.taxRate }]]
        : [],
    ),
  );
}
