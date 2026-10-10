import { cmssy } from "../../cmssy.config";
import {
  PublicSiteConfigDocument,
  SiteTaxRatesDocument,
} from "../graphql/generated/graphql";
import type { SiteLocales } from "../lib/locale-path";
import type { LocalizedValue } from "../lib/localized";
import { ttlCache } from "../lib/ttl-cache";
import { publicRequest } from "./gateway";

export interface SiteConfig {
  siteName: LocalizedValue | null;
  defaultLanguage: string | null;
  enabledLanguages: string[] | null;
  notFoundPageId: string | null;
  branding: { ogImageUrl: string | null } | null;
}

const siteConfigCache = ttlCache<SiteConfig | null>(60_000);

export function fetchSiteConfig(): Promise<SiteConfig | null> {
  return siteConfigCache("site-config", loadSiteConfig);
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

// Settings → Languages in the workspace is the only source of these. Nothing
// about languages belongs in cmssy.config.ts, and a `?? "en"` written anywhere
// else would be a second answer to the same question.
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

let cachedTax: Promise<SiteTaxRates | null> | undefined;

export function fetchTaxRates(): Promise<SiteTaxRates | null> {
  cachedTax ??= loadTaxRates().catch((error: unknown) => {
    cachedTax = undefined;
    throw error;
  });
  return cachedTax;
}

async function loadTaxRates(): Promise<SiteTaxRates | null> {
  const data = await publicRequest(SiteTaxRatesDocument, {
    workspaceSlug: cmssy.workspaceSlug,
  });
  const cart = data.public?.siteConfig?.publicCart ?? null;
  if (!cart) return null;
  return {
    defaultTaxRateId: cart.defaultTaxRateId ?? null,
    rates: new Map(cart.taxRates.map((rate) => [rate.id, rate.rate])),
  };
}
