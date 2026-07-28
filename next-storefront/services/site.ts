import { cmssy } from "@/cmssy.config";
import { PublicSiteConfigDocument } from "@/graphql/generated/graphql";
import { publicRequest } from "@/services/gateway";
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
