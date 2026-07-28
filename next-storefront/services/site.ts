import { cmssy } from "@/cmssy.config";
import { PublicSiteConfigDocument } from "@/graphql/generated/graphql";
import { publicRequest } from "@/services/gateway";
import type { SiteLocales } from "@/lib/locale-path";

export interface SiteConfig {
  siteName: string | null;
  defaultLanguage: string | null;
  enabledLanguages: string[] | null;
  notFoundPageId: string | null;
  branding: { ogImageUrl: string | null } | null;
}

let cached: SiteConfig | null | undefined;

export async function fetchSiteConfig(): Promise<SiteConfig | null> {
  if (cached !== undefined) return cached;
  const data = await publicRequest(PublicSiteConfigDocument, {
    workspaceSlug: cmssy.workspaceSlug,
  });
  const config = data.public?.siteConfig ?? null;
  cached = config
    ? {

        siteName: config.siteName as string | null,
        defaultLanguage: config.defaultLanguage,
        enabledLanguages: config.enabledLanguages,
        notFoundPageId: config.notFoundPageId,
        branding: config.branding,
      }
    : null;
  return cached;
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
